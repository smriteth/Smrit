import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:google_fonts/google_fonts.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
  ));
  runApp(const ProviderScope(child: SmritDriverApp()));
}

// ── SMRIT Brand Colors ────────────────────────────────────────
class SmritColors {
  static const primary = Color(0xFF1B4F8A);
  static const primaryDark = Color(0xFF163D6B);
  static const secondary = Color(0xFFF5A623);
  static const background = Color(0xFFF8F9FA);
  static const surface = Colors.white;
  static const success = Color(0xFF27AE60);
  static const warning = Color(0xFFF59E0B);
  static const danger = Color(0xFFE74C3C);
  static const text = Color(0xFF1A1A2E);
  static const muted = Color(0xFF6B7280);
  static const border = Color(0xFFE5E7EB);
}

ThemeData smritTheme() {
  final base = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: SmritColors.primary,
      primary: SmritColors.primary,
      secondary: SmritColors.secondary,
      surface: SmritColors.surface,
      error: SmritColors.danger,
    ).copyWith(onPrimary: Colors.white, onSecondary: SmritColors.text),
    scaffoldBackgroundColor: SmritColors.background,
    appBarTheme: AppBarTheme(
      backgroundColor: SmritColors.primary,
      foregroundColor: Colors.white,
      elevation: 0,
      titleTextStyle: GoogleFonts.inter(
        fontSize: 18, fontWeight: FontWeight.w700,
        color: Colors.white, letterSpacing: 0.5,
      ),
      systemOverlayStyle: SystemUiOverlayStyle.light,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: SmritColors.primary,
        foregroundColor: Colors.white,
        minimumSize: const Size(double.infinity, 52),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 16),
        elevation: 0,
      ),
    ),
    cardTheme: CardThemeData(
      elevation: 1,
      shadowColor: Colors.black12,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      color: Colors.white,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: const Color(0xFFF9FAFB),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: SmritColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: SmritColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: SmritColors.primary, width: 2),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    ),
  );
  return base.copyWith(textTheme: GoogleFonts.interTextTheme(base.textTheme));
}

class SmritDriverApp extends StatefulWidget {
  const SmritDriverApp({super.key});

  @override
  State<SmritDriverApp> createState() => _SmritDriverAppState();
}

class _SmritDriverAppState extends State<SmritDriverApp> {
  late Future<bool> _checkLogin;

  @override
  void initState() {
    super.initState();
    _checkLogin = _hasToken();
  }

  Future<bool> _hasToken() async {
    const storage = FlutterSecureStorage();
    final token = await storage.read(key: 'smrit_driver_token');
    return token != null;
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SMRIT Driver',
      debugShowCheckedModeBanner: false,
      theme: smritTheme(),
      home: FutureBuilder<bool>(
        future: _checkLogin,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const Scaffold(
              backgroundColor: SmritColors.primary,
              body: Center(child: _SplashContent()),
            );
          }
          return snap.data == true ? const HomeScreen() : const LoginScreen();
        },
      ),
    );
  }
}

class _SplashContent extends StatelessWidget {
  const _SplashContent();

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Image.asset('assets/images/smrit_logo.png', width: 80, height: 80),
        const SizedBox(height: 16),
        Text('SMRIT', style: GoogleFonts.inter(
          fontSize: 32, fontWeight: FontWeight.w800,
          color: Colors.white, letterSpacing: 3,
        )),
        const SizedBox(height: 4),
        Text('Fleet Management', style: GoogleFonts.inter(
          fontSize: 14, color: Colors.white60,
        )),
        const SizedBox(height: 48),
        const CircularProgressIndicator(
          color: SmritColors.secondary, strokeWidth: 3,
        ),
      ],
    );
  }
}
