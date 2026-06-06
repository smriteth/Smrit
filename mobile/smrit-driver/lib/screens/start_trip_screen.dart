import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:geolocator/geolocator.dart';
import '../main.dart';
import '../config.dart';
import '../services/fms_api_service.dart';
import '../services/gps_service.dart';
import 'active_trip_screen.dart';

class StartTripScreen extends StatefulWidget {
  const StartTripScreen({super.key});
  @override
  State<StartTripScreen> createState() => _StartTripScreenState();
}

class _StartTripScreenState extends State<StartTripScreen> {
  final _originCtrl = TextEditingController();
  final _destCtrl = TextEditingController();
  final _cargoCtrl = TextEditingController();
  final _weightCtrl = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _autoFillOrigin();
  }

  @override
  void dispose() {
    _originCtrl.dispose(); _destCtrl.dispose();
    _cargoCtrl.dispose(); _weightCtrl.dispose();
    super.dispose();
  }

  Future<void> _autoFillOrigin() async {
    try {
      final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.medium,
      );
      _originCtrl.text = '${pos.latitude.toStringAsFixed(4)}, ${pos.longitude.toStringAsFixed(4)}';
    } catch (_) {}
  }

  Future<void> _startTrip() async {
    if (_originCtrl.text.trim().isEmpty || _destCtrl.text.trim().isEmpty) {
      setState(() => _error = 'Origin and destination are required.');
      return;
    }
    setState(() { _loading = true; _error = null; });
    try {
      // Try to get GPS position for origin coords
      double lat = 9.032, lng = 38.747;
      try {
        final pos = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.high,
        );
        lat = pos.latitude; lng = pos.longitude;
      } catch (_) {}

      final result = await FmsApiService.startTrip(
        originName: _originCtrl.text.trim(),
        originLat: lat, originLng: lng,
        destinationName: _destCtrl.text.trim(),
        destLat: 9.032, destLng: 38.747,
        cargoDescription: _cargoCtrl.text.trim().isEmpty ? null : _cargoCtrl.text.trim(),
        cargoWeightKg: _weightCtrl.text.trim().isEmpty ? null : int.tryParse(_weightCtrl.text.trim()),
      );

      final profile = await FmsApiService.getCachedProfile();
      GpsService.configure(
        traccarUniqueId: profile['traccarUniqueId'] ?? '',
        osmandEndpoint: result['osmandEndpoint'] as String? ?? kGpsBaseUrl,
      );
      await GpsService.startTracking();

      if (!mounted) return;
      Navigator.pushReplacement(context, MaterialPageRoute(
        builder: (_) => ActiveTripScreen(
          tripId: result['tripId'] as String,
          destinationName: _destCtrl.text.trim(),
        ),
      ));
    } catch (e) {
      setState(() { _error = 'Could not start trip. Please try again.'; });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('New Trip')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          _field('Origin', _originCtrl, 'Addis Ababa', Icons.trip_origin,
            suffix: IconButton(
              icon: const Icon(Icons.my_location, size: 18, color: SmritColors.primary),
              onPressed: _autoFillOrigin,
              tooltip: 'Use GPS location',
            ),
          ),
          const SizedBox(height: 16),
          _field('Destination', _destCtrl, 'Dire Dawa', Icons.flag_outlined),
          const SizedBox(height: 24),
          Divider(color: SmritColors.border),
          const SizedBox(height: 8),
          Text('Cargo (optional)', style: GoogleFonts.inter(fontSize: 13, color: SmritColors.muted, fontWeight: FontWeight.w500)),
          const SizedBox(height: 12),
          _field('Cargo Description', _cargoCtrl, 'What are you transporting?', Icons.inventory_2_outlined),
          const SizedBox(height: 16),
          _field('Cargo Weight (kg)', _weightCtrl, '0', Icons.scale_outlined,
            keyboard: TextInputType.number),
          if (_error != null) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: SmritColors.danger.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: SmritColors.danger.withValues(alpha: 0.25)),
              ),
              child: Row(children: [
                const Icon(Icons.error_outline, size: 16, color: SmritColors.danger),
                const SizedBox(width: 8),
                Expanded(child: Text(_error!, style: GoogleFonts.inter(fontSize: 13, color: SmritColors.danger))),
              ]),
            ),
          ],
          const SizedBox(height: 32),
          SizedBox(
            width: double.infinity, height: 56,
            child: ElevatedButton.icon(
              onPressed: _loading ? null : _startTrip,
              icon: _loading
                  ? const SizedBox(width: 20, height: 20,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                  : const Icon(Icons.play_arrow_rounded, size: 24),
              label: Text(_loading ? 'Starting...' : 'Start Trip',
                style: GoogleFonts.inter(fontSize: 17, fontWeight: FontWeight.w700)),
            ),
          ),
        ]),
      ),
    );
  }

  Widget _field(String label, TextEditingController ctrl, String hint, IconData icon,
      {Widget? suffix, TextInputType keyboard = TextInputType.text}) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w500, color: SmritColors.text)),
      const SizedBox(height: 8),
      TextFormField(
        controller: ctrl,
        keyboardType: keyboard,
        style: GoogleFonts.inter(fontSize: 15),
        decoration: InputDecoration(
          prefixIcon: Icon(icon, size: 20, color: SmritColors.muted),
          hintText: hint,
          suffixIcon: suffix,
        ),
      ),
    ]);
  }
}
