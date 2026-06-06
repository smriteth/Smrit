import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../main.dart';
import '../config.dart';
import '../services/fms_api_service.dart';
import '../services/gps_service.dart';
import 'home_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _phone = TextEditingController(text: '+251');
  final _pass = TextEditingController();
  bool _loading = false, _obscure = true;
  String? _error;

  @override
  void dispose() { _phone.dispose(); _pass.dispose(); super.dispose(); }

  Future<void> _login() async {
    if (_phone.text.trim().isEmpty || _pass.text.isEmpty) {
      setState(() => _error = 'Enter your phone number and password.');
      return;
    }
    setState(() { _loading = true; _error = null; });
    try {
      final data = await FmsApiService.login(_phone.text.trim(), _pass.text);
      final truck = data['truck'] as Map<String, dynamic>;
      GpsService.configure(
        traccarUniqueId: truck['traccarUniqueId'] as String,
        osmandEndpoint: kGpsBaseUrl,
      );
      if (!mounted) return;
      Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const HomeScreen()));
    } catch (e) {
      setState(() {
        _error = e.toString().contains('403')
            ? 'No truck assigned. Contact your fleet manager.'
            : 'Invalid phone number or password.';
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: AnnotatedRegion<SystemUiOverlayStyle>(
        value: SystemUiOverlayStyle.light,
        child: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter, end: Alignment.bottomCenter,
              colors: [SmritColors.primary, Color(0xFF163D6B)],
            ),
          ),
          child: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(children: [
                const SizedBox(height: 56),
                // Logo
                ClipRRect(
                  borderRadius: BorderRadius.circular(20),
                  child: Image.asset('assets/images/smrit_logo.png', width: 84, height: 84,
                    errorBuilder: (_, __, ___) => Container(
                      width: 84, height: 84,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Icon(Icons.local_shipping_outlined, size: 44, color: SmritColors.secondary),
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                Text('SMRIT', style: GoogleFonts.inter(
                  fontSize: 34, fontWeight: FontWeight.w800, color: Colors.white, letterSpacing: 4,
                )),
                Text('Driver Portal', style: GoogleFonts.inter(
                  fontSize: 13, color: SmritColors.secondary, fontWeight: FontWeight.w500,
                )),
                const SizedBox(height: 44),
                // Card
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white, borderRadius: BorderRadius.circular(24),
                    boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.18), blurRadius: 24, offset: const Offset(0, 8))],
                  ),
                  padding: const EdgeInsets.all(28),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('Sign In', style: GoogleFonts.inter(fontSize: 22, fontWeight: FontWeight.w700, color: SmritColors.text)),
                    const SizedBox(height: 4),
                    Text('Enter your credentials to continue', style: GoogleFonts.inter(fontSize: 13, color: SmritColors.muted)),
                    const SizedBox(height: 24),
                    _label('Phone Number'),
                    const SizedBox(height: 8),
                    TextFormField(
                      controller: _phone,
                      keyboardType: TextInputType.phone,
                      style: GoogleFonts.inter(fontSize: 15),
                      decoration: const InputDecoration(
                        prefixIcon: Icon(Icons.phone_outlined, size: 20, color: SmritColors.muted),
                        hintText: '+251 9XX XXX XXX',
                      ),
                    ),
                    const SizedBox(height: 16),
                    _label('Password'),
                    const SizedBox(height: 8),
                    TextFormField(
                      controller: _pass,
                      obscureText: _obscure,
                      style: GoogleFonts.inter(fontSize: 15),
                      onFieldSubmitted: (_) => _login(),
                      decoration: InputDecoration(
                        prefixIcon: const Icon(Icons.lock_outline, size: 20, color: SmritColors.muted),
                        hintText: '••••••••',
                        suffixIcon: IconButton(
                          icon: Icon(_obscure ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                            size: 20, color: SmritColors.muted),
                          onPressed: () => setState(() => _obscure = !_obscure),
                        ),
                      ),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 14),
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
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity, height: 52,
                      child: ElevatedButton(
                        onPressed: _loading ? null : _login,
                        child: _loading
                            ? const SizedBox(width: 22, height: 22,
                                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                            : Text('Sign In', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w600)),
                      ),
                    ),
                  ]),
                ),
                const SizedBox(height: 32),
                Text('Having trouble? Contact your fleet manager.',
                  style: GoogleFonts.inter(fontSize: 13, color: Colors.white54), textAlign: TextAlign.center),
                const SizedBox(height: 24),
              ]),
            ),
          ),
        ),
      ),
    );
  }

  Widget _label(String text) => Text(text, style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w500, color: SmritColors.text));
}
