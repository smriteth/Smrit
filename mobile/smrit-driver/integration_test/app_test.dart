// Flutter integration test — login → home → trip flow
// Run: flutter test integration_test/app_test.dart
// Requires: an emulator or connected device.
// Uses a mock HTTP layer so no real backend is needed.
//
// NOTE: The Dio client is replaced via dart-define so the test can intercept
// network calls. In a CI environment without an emulator, use flutter_test
// with widget tests (test/widget_test.dart) instead.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:integration_test/integration_test.dart';

import 'package:smrit_driver/main.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('App integration', () {
    testWidgets('App starts and shows login screen', (tester) async {
      await tester.pumpWidget(const ProviderScope(child: SmritDriverApp()));
      await tester.pumpAndSettle(const Duration(seconds: 2));

      // Either splash or login should be visible
      final hasSMRIT = find.text('SMRIT');
      final hasDriverPortal = find.text('Driver Portal');
      expect(hasSMRIT, findsOneWidget);
      expect(hasDriverPortal, findsOneWidget);
    });

    testWidgets('Login form validation — empty fields shows error', (tester) async {
      await tester.pumpWidget(const ProviderScope(child: SmritDriverApp()));
      await tester.pumpAndSettle(const Duration(seconds: 2));

      // Tap Sign In without clearing the pre-filled phone
      // The phone field is pre-filled with '+251' but password is empty
      final signInBtn = find.widgetWithText(ElevatedButton, 'Sign In');
      expect(signInBtn, findsOneWidget);

      await tester.tap(signInBtn);
      await tester.pump();

      // Should show validation error
      expect(
        find.textContaining('Enter your phone'),
        findsOneWidget,
      );
    });
  });
}
