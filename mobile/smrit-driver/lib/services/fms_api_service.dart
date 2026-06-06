import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config.dart';

class FmsApiService {
  static const _storage = FlutterSecureStorage();

  static late final Dio _dio;
  static bool _initialized = false;

  static void init() {
    if (_initialized) return;
    _initialized = true;
    _dio = Dio(BaseOptions(
      baseUrl: kApiBaseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 15),
    ));
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.read(key: 'smrit_driver_token');
        if (token != null) options.headers['Authorization'] = 'Bearer $token';
        handler.next(options);
      },
      onError: (error, handler) {
        if (error.response?.statusCode == 401) {
          _storage.delete(key: 'smrit_driver_token');
        }
        handler.next(error);
      },
    ));
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> login(String phone, String password) async {
    init();
    final res = await _dio.post('/auth/driver/login', data: {'phone': phone, 'password': password});
    final data = res.data as Map<String, dynamic>;
    await _storage.write(key: 'smrit_driver_token', value: data['token'] as String);
    await _storage.write(key: 'smrit_driver_name', value: (data['driver'] as Map)['name'] as String);
    await _storage.write(key: 'smrit_driver_phone', value: (data['driver'] as Map)['phone'] as String);
    await _storage.write(key: 'smrit_driver_id', value: (data['driver'] as Map)['id'] as String);
    await _storage.write(key: 'smrit_truck_plate', value: (data['truck'] as Map)['licensePlate'] as String);
    await _storage.write(key: 'smrit_truck_model', value: (data['truck'] as Map)['name'] as String);
    await _storage.write(key: 'smrit_truck_id', value: (data['truck'] as Map)['id'] as String);
    await _storage.write(key: 'smrit_traccar_unique_id', value: (data['truck'] as Map)['traccarUniqueId'] as String);
    return data;
  }

  static Future<void> logout() async {
    await _storage.deleteAll();
  }

  static Future<Map<String, String?>> getCachedProfile() async {
    return {
      'name': await _storage.read(key: 'smrit_driver_name'),
      'phone': await _storage.read(key: 'smrit_driver_phone'),
      'driverId': await _storage.read(key: 'smrit_driver_id'),
      'truckPlate': await _storage.read(key: 'smrit_truck_plate'),
      'truckModel': await _storage.read(key: 'smrit_truck_model'),
      'truckId': await _storage.read(key: 'smrit_truck_id'),
      'traccarUniqueId': await _storage.read(key: 'smrit_traccar_unique_id'),
    };
  }

  // ── Trips ─────────────────────────────────────────────────────────────────
  static Future<Map<String, dynamic>?> getActiveTrip() async {
    init();
    try {
      final res = await _dio.get('/trips/active');
      final data = res.data as Map<String, dynamic>;
      return data['active'] == true ? data['trip'] as Map<String, dynamic> : null;
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) return null;
      rethrow;
    }
  }

  static Future<Map<String, dynamic>> startTrip({
    required String originName,
    required double originLat,
    required double originLng,
    required String destinationName,
    required double destLat,
    required double destLng,
    String? cargoDescription,
    int? cargoWeightKg,
    String? plannedArrival,
    String? preInspectionId,
  }) async {
    init();
    final res = await _dio.post('/trips/start', data: {
      'originName': originName,
      'originLat': originLat,
      'originLng': originLng,
      'destinationName': destinationName,
      'destLat': destLat,
      'destLng': destLng,
      if (cargoDescription != null) 'cargoDescription': cargoDescription,
      if (cargoWeightKg != null) 'cargoWeightKg': cargoWeightKg,
      if (plannedArrival != null) 'plannedArrival': plannedArrival,
      if (preInspectionId != null) 'preInspectionId': preInspectionId,
    });
    return res.data as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> completeTrip(String tripId) async {
    init();
    final res = await _dio.post('/trips/$tripId/complete');
    return res.data as Map<String, dynamic>;
  }

  static Future<List<Map<String, dynamic>>> getTripHistory({int limit = 20, int offset = 0}) async {
    init();
    final res = await _dio.get('/trips/mine', queryParameters: {'limit': limit, 'offset': offset});
    return (res.data as List).cast<Map<String, dynamic>>();
  }

  // ── Inspections ──────────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> submitInspection({
    required String truckId,
    required String driverId,
    required String type,
    required List<Map<String, dynamic>> checklist,
    String? notes,
  }) async {
    init();
    final res = await _dio.post('/inspections', data: {
      'truckId': truckId,
      'driverId': driverId,
      'type': type,
      'checklist': checklist,
      if (notes != null) 'notes': notes,
    });
    return res.data as Map<String, dynamic>;
  }

  // ── Earnings ─────────────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> getEarnings(String driverId) async {
    init();
    final res = await _dio.get('/drivers/$driverId/earnings');
    return res.data as Map<String, dynamic>;
  }
}
