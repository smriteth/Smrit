import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../main.dart';
import '../services/fms_api_service.dart';
import 'login_screen.dart';
import 'start_trip_screen.dart';
import 'active_trip_screen.dart';
import 'trip_history_screen.dart';
import 'earnings_screen.dart';
import 'profile_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _tab = 0;
  Map<String, String?> _profile = {};
  Map<String, dynamic>? _activeTrip;
  bool _loadingTrip = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final profile = await FmsApiService.getCachedProfile();
    Map<String, dynamic>? activeTrip;
    try {
      activeTrip = await FmsApiService.getActiveTrip();
    } catch (_) {}
    if (!mounted) return;
    setState(() {
      _profile = profile;
      _activeTrip = activeTrip;
      _loadingTrip = false;
    });
  }

  Future<void> _logout() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Sign Out'),
        content: const Text('Are you sure you want to sign out?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(context, true),
            child: const Text('Sign Out', style: TextStyle(color: SmritColors.danger))),
        ],
      ),
    );
    if (ok != true) return;
    await FmsApiService.logout();
    if (!mounted) return;
    Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const LoginScreen()));
  }

  @override
  Widget build(BuildContext context) {
    final tabs = [
      _HomeTab(profile: _profile, activeTrip: _activeTrip, loadingTrip: _loadingTrip, onRefresh: _load),
      const TripHistoryScreen(),
      EarningsScreen(driverId: _profile['driverId'] ?? ''),
      ProfileScreen(profile: _profile, onLogout: _logout),
    ];

    return Scaffold(
      appBar: AppBar(
        title: Row(children: [
          Image.asset('assets/images/smrit_logo.png', width: 28, height: 28,
            errorBuilder: (_, __, ___) => const Icon(Icons.local_shipping, size: 24, color: SmritColors.secondary)),
          const SizedBox(width: 8),
          const Text('SMRIT'),
        ]),
        actions: [
          IconButton(icon: const Icon(Icons.refresh_outlined), onPressed: _load),
        ],
      ),
      body: IndexedStack(index: _tab, children: tabs),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _tab,
        onTap: (i) => setState(() => _tab = i),
        type: BottomNavigationBarType.fixed,
        selectedItemColor: SmritColors.primary,
        unselectedItemColor: SmritColors.muted,
        selectedLabelStyle: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600),
        unselectedLabelStyle: GoogleFonts.inter(fontSize: 11),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home_outlined), activeIcon: Icon(Icons.home), label: 'Home'),
          BottomNavigationBarItem(icon: Icon(Icons.route_outlined), activeIcon: Icon(Icons.route), label: 'Trips'),
          BottomNavigationBarItem(icon: Icon(Icons.payments_outlined), activeIcon: Icon(Icons.payments), label: 'Earnings'),
          BottomNavigationBarItem(icon: Icon(Icons.person_outlined), activeIcon: Icon(Icons.person), label: 'Profile'),
        ],
      ),
    );
  }
}

class _HomeTab extends StatelessWidget {
  final Map<String, String?> profile;
  final Map<String, dynamic>? activeTrip;
  final bool loadingTrip;
  final VoidCallback onRefresh;

  const _HomeTab({required this.profile, required this.activeTrip, required this.loadingTrip, required this.onRefresh});

  @override
  Widget build(BuildContext context) {
    final name = profile['name'] ?? 'Driver';
    final plate = profile['truckPlate'] ?? '—';
    final model = profile['truckModel'] ?? '—';
    final hour = DateTime.now().hour;
    final greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    return RefreshIndicator(
      onRefresh: () async => onRefresh(),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          // Greeting
          Text('$greeting,', style: GoogleFonts.inter(fontSize: 14, color: SmritColors.muted)),
          Text(name, style: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.w800, color: SmritColors.text)),
          const SizedBox(height: 20),

          // Truck card
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                begin: Alignment.topLeft, end: Alignment.bottomRight,
                colors: [SmritColors.primary, Color(0xFF1A3A5C)],
              ),
              borderRadius: BorderRadius.circular(20),
              boxShadow: [BoxShadow(color: SmritColors.primary.withValues(alpha: 0.3), blurRadius: 16, offset: const Offset(0, 6))],
            ),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                const Icon(Icons.local_shipping, color: SmritColors.secondary, size: 20),
                const SizedBox(width: 8),
                Text('Assigned Vehicle', style: GoogleFonts.inter(fontSize: 12, color: Colors.white60)),
              ]),
              const SizedBox(height: 12),
              Text(plate, style: GoogleFonts.inter(fontSize: 28, fontWeight: FontWeight.w800, color: Colors.white, letterSpacing: 2)),
              const SizedBox(height: 4),
              Text(model, style: GoogleFonts.inter(fontSize: 13, color: SmritColors.secondary)),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: SmritColors.success.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: SmritColors.success.withValues(alpha: 0.4)),
                ),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  Container(width: 6, height: 6, decoration: const BoxDecoration(color: SmritColors.success, shape: BoxShape.circle)),
                  const SizedBox(width: 6),
                  Text('ACTIVE', style: GoogleFonts.inter(fontSize: 11, color: SmritColors.success, fontWeight: FontWeight.w700)),
                ]),
              ),
            ]),
          ),
          const SizedBox(height: 20),

          // Active trip or start trip
          if (loadingTrip)
            const Center(child: CircularProgressIndicator())
          else if (activeTrip != null) ...[
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: SmritColors.success.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: SmritColors.success.withValues(alpha: 0.3)),
              ),
              child: Row(children: [
                Container(
                  width: 10, height: 10,
                  decoration: const BoxDecoration(color: SmritColors.success, shape: BoxShape.circle),
                ),
                const SizedBox(width: 12),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('ACTIVE TRIP', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w700, color: SmritColors.success)),
                  Text('${activeTrip!['originName']} → ${activeTrip!['destinationName']}',
                    style: GoogleFonts.inter(fontSize: 13, color: SmritColors.text)),
                ])),
                TextButton(
                  onPressed: () => Navigator.push(context, MaterialPageRoute(
                    builder: (_) => ActiveTripScreen(tripId: activeTrip!['id'] as String,
                      destinationName: activeTrip!['destinationName'] as String))),
                  child: Text('Resume', style: GoogleFonts.inter(fontWeight: FontWeight.w600, color: SmritColors.primary)),
                ),
              ]),
            ),
          ] else ...[
            SizedBox(
              width: double.infinity, height: 58,
              child: ElevatedButton.icon(
                onPressed: () async {
                  await Navigator.push(context, MaterialPageRoute(builder: (_) => const StartTripScreen()));
                  onRefresh();
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: SmritColors.secondary, foregroundColor: SmritColors.text,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                icon: const Icon(Icons.play_arrow_rounded, size: 26),
                label: Text('Start New Trip', style: GoogleFonts.inter(fontSize: 17, fontWeight: FontWeight.w700)),
              ),
            ),
          ],
        ]),
      ),
    );
  }
}
