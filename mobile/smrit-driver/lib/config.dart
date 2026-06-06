// Runtime configuration for the SMRIT driver app.
//
// Override defaults via --dart-define at build time:
//   flutter run --dart-define=API_BASE_URL=http://192.168.1.100:3016/api \
//               --dart-define=GPS_BASE_URL=http://192.168.1.100:5055/
//
// Emulator defaults are only for local development. Release builds must provide
// explicit HTTPS endpoints for both API_BASE_URL and GPS_BASE_URL.

String _resolveBaseUrl({
  required String name,
  required String localFallback,
}) {
  final value = String.fromEnvironment(name, defaultValue: localFallback);

  if (const bool.fromEnvironment('dart.vm.product')) {
    final isHttps = value.startsWith('https://');
    final isLocal = RegExp(r'localhost|127\.0\.0\.1|10\.0\.2\.2').hasMatch(value);

    if (value.isEmpty || !isHttps || isLocal) {
      throw StateError(
        '$name must be an explicit HTTPS URL in release builds.',
      );
    }
  }

  return value;
}

final String kApiBaseUrl = _resolveBaseUrl(
  name: 'API_BASE_URL',
  localFallback: 'http://10.0.2.2:3016/api',
);

final String kGpsBaseUrl = _resolveBaseUrl(
  name: 'GPS_BASE_URL',
  localFallback: 'http://10.0.2.2:5055/',
);
