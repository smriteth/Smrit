import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../main.dart';
import 'home_screen.dart';

class TripSummaryScreen extends StatelessWidget {
  final Map<String, dynamic> result;
  const TripSummaryScreen({super.key, required this.result});

  @override
  Widget build(BuildContext context) {
    final earnings = result['earnings'] as Map<String, dynamic>?;
    final distanceKm = result['distanceKm'];
    final durationMin = result['durationMinutes'];

    return Scaffold(
      backgroundColor: SmritColors.background,
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(children: [
            // Header
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 24),
              color: SmritColors.success,
              child: Column(children: [
                Container(
                  width: 80, height: 80,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.25),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.check_rounded, size: 48, color: Colors.white),
                ),
                const SizedBox(height: 16),
                Text('Trip Completed!', style: GoogleFonts.inter(
                  fontSize: 26, fontWeight: FontWeight.w800, color: Colors.white)),
              ]),
            ),

            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(children: [
                // Stats grid
                GridView.count(
                  crossAxisCount: 2, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
                  crossAxisSpacing: 12, mainAxisSpacing: 12, childAspectRatio: 1.6,
                  children: [
                    _statCard('Distance', distanceKm != null ? '${distanceKm} km' : '—', Icons.route_outlined, SmritColors.primary),
                    _statCard('Duration', durationMin != null ? '${durationMin} min' : '—', Icons.timer_outlined, Colors.purple),
                    _statCard('Max Speed', result['maxSpeedKmh'] != null ? '${result['maxSpeedKmh']} km/h' : '—',
                        Icons.speed_outlined, SmritColors.warning),
                    _statCard('Avg Speed', result['avgSpeedKmh'] != null ? '${result['avgSpeedKmh']} km/h' : '—',
                        Icons.analytics_outlined, Colors.teal),
                  ],
                ),
                const SizedBox(height: 20),

                // Earnings card
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(22),
                  decoration: BoxDecoration(
                    color: SmritColors.primary,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [BoxShadow(color: SmritColors.primary.withValues(alpha: 0.3), blurRadius: 16, offset: const Offset(0, 6))],
                  ),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('Your Earnings', style: GoogleFonts.inter(
                      fontSize: 14, fontWeight: FontWeight.w600, color: SmritColors.secondary)),
                    const SizedBox(height: 16),
                    _earningsRow('Base Earnings', earnings?['base'], Colors.white70),
                    if (earnings?['bonus'] != null && (earnings!['bonus'] as num) > 0)
                      _earningsRow('On-time Bonus', earnings['bonus'], SmritColors.success, prefix: '+'),
                    if (earnings?['penalty'] != null && (earnings!['penalty'] as num) > 0)
                      _earningsRow('Late Penalty', earnings['penalty'], SmritColors.danger, prefix: '-'),
                    Divider(color: Colors.white24, height: 28),
                    Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                      Text('TOTAL', style: GoogleFonts.inter(
                        fontSize: 16, fontWeight: FontWeight.w800, color: Colors.white, letterSpacing: 1)),
                      Text('ETB ${_fmt(earnings?['total'])}', style: GoogleFonts.inter(
                        fontSize: 28, fontWeight: FontWeight.w800, color: SmritColors.secondary)),
                    ]),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: SmritColors.warning.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: SmritColors.warning.withValues(alpha: 0.4)),
                      ),
                      child: Text('PENDING APPROVAL', style: GoogleFonts.inter(
                        fontSize: 11, color: SmritColors.secondary, fontWeight: FontWeight.w700, letterSpacing: 1)),
                    ),
                  ]),
                ),
                const SizedBox(height: 28),

                SizedBox(
                  width: double.infinity, height: 56,
                  child: ElevatedButton(
                    onPressed: () => Navigator.pushAndRemoveUntil(
                      context,
                      MaterialPageRoute(builder: (_) => const HomeScreen()),
                      (_) => false,
                    ),
                    child: Text('Back to Home', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700)),
                  ),
                ),
              ]),
            ),
          ]),
        ),
      ),
    );
  }

  Widget _statCard(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white, borderRadius: BorderRadius.circular(14),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 8)],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
        Icon(icon, size: 20, color: color),
        const SizedBox(height: 6),
        Text(value, style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700, color: SmritColors.text)),
        Text(label, style: GoogleFonts.inter(fontSize: 11, color: SmritColors.muted)),
      ]),
    );
  }

  Widget _earningsRow(String label, dynamic value, Color color, {String prefix = ''}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Text(label, style: GoogleFonts.inter(fontSize: 13, color: Colors.white70)),
        Text('$prefix ETB ${_fmt(value)}', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: color)),
      ]),
    );
  }

  String _fmt(dynamic v) {
    if (v == null) return '—';
    final n = (v is num) ? v : double.tryParse(v.toString()) ?? 0;
    return n.toStringAsFixed(2);
  }
}
