import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'dart:async';
import '../main.dart';
import '../services/fms_api_service.dart';
import '../services/gps_service.dart';
import 'trip_summary_screen.dart';

class ActiveTripScreen extends StatefulWidget {
  final String tripId;
  final String destinationName;
  const ActiveTripScreen({super.key, required this.tripId, required this.destinationName});
  @override
  State<ActiveTripScreen> createState() => _ActiveTripScreenState();
}

class _ActiveTripScreenState extends State<ActiveTripScreen> with WidgetsBindingObserver {
  late final DateTime _startTime;
  late Timer _ticker;
  Duration _elapsed = Duration.zero;
  bool _stopping = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _startTime = DateTime.now();
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() => _elapsed = DateTime.now().difference(_startTime));
    });
    SystemChrome.setSystemUIOverlayStyle(SystemUiOverlayStyle.light);
  }

  @override
  void dispose() {
    _ticker.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  String _format(Duration d) {
    final h = d.inHours.toString().padLeft(2, '0');
    final m = (d.inMinutes % 60).toString().padLeft(2, '0');
    final s = (d.inSeconds % 60).toString().padLeft(2, '0');
    return '$h:$m:$s';
  }

  Future<void> _endTrip() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('End This Trip?'),
        content: const Text('GPS tracking will stop and your earnings will be calculated.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: SmritColors.danger),
            child: const Text('End Trip'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    setState(() => _stopping = true);
    try {
      await GpsService.stopTracking();
      final result = await FmsApiService.completeTrip(widget.tripId);
      if (!mounted) return;
      Navigator.pushReplacement(context,
        MaterialPageRoute(builder: (_) => TripSummaryScreen(result: result)));
    } catch (_) {
      setState(() => _stopping = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Error completing trip. Please try again.'), backgroundColor: SmritColors.danger),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final speed = GpsService.currentSpeedKmh.toStringAsFixed(0);
    final lastSent = GpsService.lastSentAt;
    final secAgo = lastSent != null
        ? DateTime.now().difference(lastSent).inSeconds
        : null;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) { if (!didPop) _endTrip(); },
      child: Scaffold(
        backgroundColor: SmritColors.primary,
        body: AnnotatedRegion<SystemUiOverlayStyle>(
          value: SystemUiOverlayStyle.light,
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(children: [
                // Header
                Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                  Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [
                      Container(
                        width: 8, height: 8,
                        decoration: BoxDecoration(
                          color: GpsService.isTracking ? SmritColors.success : SmritColors.danger,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        GpsService.isTracking ? 'GPS ACTIVE' : 'GPS INACTIVE',
                        style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w700,
                          color: GpsService.isTracking ? SmritColors.success : SmritColors.danger,
                          letterSpacing: 1),
                      ),
                    ]),
                    if (secAgo != null)
                      Text('Last sent ${secAgo}s ago', style: GoogleFonts.inter(fontSize: 10, color: Colors.white38)),
                  ]),
                  Text('TRIP ACTIVE', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.white54, letterSpacing: 1)),
                ]),

                const Spacer(),

                // Elapsed timer
                Text(_format(_elapsed), style: GoogleFonts.jetBrainsMono(
                  fontSize: 60, fontWeight: FontWeight.w300, color: Colors.white,
                )),
                const SizedBox(height: 8),
                Text('elapsed', style: GoogleFonts.inter(fontSize: 13, color: Colors.white38)),

                const SizedBox(height: 40),

                // Stats row
                Row(mainAxisAlignment: MainAxisAlignment.spaceEvenly, children: [
                  _stat('SPEED', '$speed km/h'),
                  Container(width: 1, height: 40, color: Colors.white12),
                  _stat('STATUS', _stopping ? 'Completing...' : 'In Transit'),
                ]),

                const SizedBox(height: 32),

                // Route card
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.white12),
                  ),
                  child: Row(children: [
                    const Icon(Icons.flag_outlined, color: SmritColors.secondary, size: 20),
                    const SizedBox(width: 12),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text('Destination', style: GoogleFonts.inter(fontSize: 11, color: Colors.white38)),
                      Text(widget.destinationName, style: GoogleFonts.inter(
                        fontSize: 15, fontWeight: FontWeight.w600, color: Colors.white)),
                    ])),
                  ]),
                ),

                const Spacer(),

                Text('Tracking location every 30 seconds', style: GoogleFonts.inter(fontSize: 12, color: Colors.white30)),
                const SizedBox(height: 16),

                // End trip button
                SizedBox(
                  width: 220, height: 58,
                  child: ElevatedButton(
                    onPressed: (_stopping) ? null : _endTrip,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: SmritColors.danger,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                    ),
                    child: _stopping
                        ? const CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5)
                        : Text('End Trip', style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700)),
                  ),
                ),
                const SizedBox(height: 16),
              ]),
            ),
          ),
        ),
      ),
    );
  }

  Widget _stat(String label, String value) => Column(children: [
    Text(value, style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700, color: Colors.white)),
    const SizedBox(height: 2),
    Text(label, style: GoogleFonts.inter(fontSize: 10, color: Colors.white38, letterSpacing: 1)),
  ]);
}
