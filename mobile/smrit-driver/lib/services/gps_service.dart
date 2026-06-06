import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:geolocator/geolocator.dart';

class GpsService {
  static const _storage = FlutterSecureStorage();
  static const _queueKey = 'smrit_gps_queue';
  static const _maxQueue = 500;

  static String? _uid;
  static String? _ep;
  static bool _isTracking = false;
  static StreamSubscription<Position>? _sub;
  static Position? _lastPosition;
  static DateTime? _lastSentAt;
  static bool _flushing = false;

  static final _dio = Dio(BaseOptions(connectTimeout: const Duration(seconds: 5)));
  static final List<Map<String, dynamic>> _queue = [];

  static void configure({
    required String traccarUniqueId,
    required String osmandEndpoint,
  }) {
    _uid = traccarUniqueId;
    _ep = osmandEndpoint.endsWith('/') ? osmandEndpoint : '$osmandEndpoint/';
    _loadQueue(); // restore any points buffered during a previous offline session
  }

  static Future<void> startTracking() async {
    if (_isTracking) return;
    await _requestPermission();
    _isTracking = true;
    _sub = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 20,
      ),
    ).listen((pos) {
      _lastPosition = pos;
      _sendOrQueue(pos);
    }, onError: (_) {});
  }

  static Future<void> stopTracking() async {
    _isTracking = false;
    await _sub?.cancel();
    _sub = null;
    _lastPosition = null;
    _lastSentAt = null;
    await _persistQueue();
  }

  /// Try to send live position. On failure, buffer it. On success, drain queue.
  static Future<void> _sendOrQueue(Position pos) async {
    if (_uid == null || _ep == null) return;
    final point = _posToMap(pos);
    try {
      await _post(point);
      _lastSentAt = DateTime.now();
      await _flushQueue();
    } catch (_) {
      if (_queue.length < _maxQueue) _queue.add(point);
    }
  }

  static Future<void> _post(Map<String, dynamic> point) async {
    await _dio.get(_ep!, queryParameters: {'id': _uid, ...point, 'batt': 100});
  }

  /// Drain offline-buffered positions after connectivity is restored.
  static Future<void> _flushQueue() async {
    if (_flushing || _queue.isEmpty) return;
    _flushing = true;
    try {
      while (_queue.isNotEmpty) {
        await _post(_queue.first);
        _queue.removeAt(0);
      }
      await _storage.delete(key: _queueKey);
    } catch (_) {
      // Still offline — persist what remains for next startup
      await _persistQueue();
    } finally {
      _flushing = false;
    }
  }

  static Map<String, dynamic> _posToMap(Position pos) => {
        'lat': pos.latitude,
        'lon': pos.longitude,
        'speed': pos.speed,
        'bearing': pos.heading,
        'altitude': pos.altitude,
        'accuracy': pos.accuracy,
      };

  static Future<void> _persistQueue() async {
    if (_queue.isEmpty) {
      await _storage.delete(key: _queueKey);
    } else {
      await _storage.write(key: _queueKey, value: jsonEncode(_queue));
    }
  }

  static Future<void> _loadQueue() async {
    try {
      final raw = await _storage.read(key: _queueKey);
      if (raw != null) {
        final list = (jsonDecode(raw) as List).cast<Map<String, dynamic>>();
        _queue
          ..clear()
          ..addAll(list.take(_maxQueue));
      }
    } catch (_) {
      await _storage.delete(key: _queueKey);
    }
  }

  static Future<void> _requestPermission() async {
    LocationPermission perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.denied) {
      perm = await Geolocator.requestPermission();
      if (perm == LocationPermission.denied) {
        throw Exception('Location permission denied');
      }
    }
    if (perm == LocationPermission.deniedForever) {
      throw Exception('Location permission permanently denied — enable in device settings.');
    }
  }

  static bool get isTracking => _isTracking;
  static Position? get lastPosition => _lastPosition;
  static DateTime? get lastSentAt => _lastSentAt;
  static int get queuedPointCount => _queue.length;
  static double get currentSpeedKmh =>
      _lastPosition != null ? _lastPosition!.speed * 3.6 : 0.0;
}
