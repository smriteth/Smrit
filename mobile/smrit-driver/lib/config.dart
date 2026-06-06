// Runtime configuration for the SMRIT driver app.
//
// Override defaults via --dart-define at build time:
//   flutter run --dart-define=API_BASE_URL=http://192.168.1.100:3016/api \
//               --dart-define=GPS_BASE_URL=http://192.168.1.100:5055/
//
// For Android emulator development, the defaults (10.0.2.2) point at the
// host machine. For iOS simulator use 127.0.0.1. For physical devices use
// the actual LAN IP of the development machine.

const String kApiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://10.0.2.2:3016/api',
);

const String kGpsBaseUrl = String.fromEnvironment(
  'GPS_BASE_URL',
  defaultValue: 'http://10.0.2.2:5055/',
);
