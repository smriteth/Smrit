import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../main.dart';

class ProfileScreen extends StatelessWidget {
  final Map<String, String?> profile;
  final VoidCallback onLogout;
  const ProfileScreen({super.key, required this.profile, required this.onLogout});

  @override
  Widget build(BuildContext context) {
    final name = profile['name'] ?? 'Driver';
    final phone = profile['phone'] ?? '—';
    final plate = profile['truckPlate'] ?? '—';
    final model = profile['truckModel'] ?? '—';
    final initials = name.isNotEmpty
        ? name.trim().split(' ').map((w) => w.isNotEmpty ? w[0] : '').take(2).join().toUpperCase()
        : 'D';

    return SingleChildScrollView(
      child: Column(children: [
        // Header
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 32),
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter, end: Alignment.bottomCenter,
              colors: [SmritColors.primary, Color(0xFF1A3A5C)],
            ),
          ),
          child: Column(children: [
            CircleAvatar(
              radius: 40,
              backgroundColor: Colors.white.withValues(alpha: 0.2),
              child: Text(initials, style: GoogleFonts.inter(
                fontSize: 28, fontWeight: FontWeight.w700, color: Colors.white)),
            ),
            const SizedBox(height: 12),
            Text(name, style: GoogleFonts.inter(fontSize: 22, fontWeight: FontWeight.w700, color: Colors.white)),
            Text(phone, style: GoogleFonts.inter(fontSize: 14, color: Colors.white70)),
          ]),
        ),

        Padding(
          padding: const EdgeInsets.all(20),
          child: Column(children: [
            // Info card
            Container(
              decoration: BoxDecoration(
                color: Colors.white, borderRadius: BorderRadius.circular(16),
                boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8)],
              ),
              child: Column(children: [
                _infoTile(Icons.local_shipping_outlined, 'Assigned Truck', '$plate — $model'),
                _divider(),
                _infoTile(Icons.phone_outlined, 'Phone', phone),
              ]),
            ),
            const SizedBox(height: 24),

            // Sign out
            SizedBox(
              width: double.infinity, height: 52,
              child: OutlinedButton.icon(
                onPressed: onLogout,
                style: OutlinedButton.styleFrom(
                  foregroundColor: SmritColors.danger,
                  side: const BorderSide(color: SmritColors.danger),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                icon: const Icon(Icons.logout, size: 20),
                label: Text('Sign Out', style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600)),
              ),
            ),
            const SizedBox(height: 24),

            // Branding footer
            Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              Image.asset('assets/images/smrit_logo.png', width: 24, height: 24,
                errorBuilder: (_, __, ___) => const Icon(Icons.local_shipping, size: 20, color: SmritColors.primary)),
              const SizedBox(width: 8),
              Text('SMRIT Fleet Management', style: GoogleFonts.inter(
                fontSize: 13, fontWeight: FontWeight.w600, color: SmritColors.muted)),
            ]),
            const SizedBox(height: 4),
            Text('Version 1.0.0', style: GoogleFonts.inter(fontSize: 11, color: SmritColors.muted)),
          ]),
        ),
      ]),
    );
  }

  Widget _infoTile(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(children: [
        Icon(icon, size: 20, color: SmritColors.primary),
        const SizedBox(width: 14),
        Text(label, style: GoogleFonts.inter(fontSize: 14, color: SmritColors.muted)),
        const Spacer(),
        Flexible(child: Text(value, style: GoogleFonts.inter(
          fontSize: 14, fontWeight: FontWeight.w600, color: SmritColors.text),
          textAlign: TextAlign.right)),
      ]),
    );
  }

  Widget _divider() => Divider(height: 1, color: SmritColors.border, indent: 16, endIndent: 16);
}
