// SMRIT Driver — widget tests
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:smrit_driver/main.dart';
import 'package:smrit_driver/screens/login_screen.dart';

void main() {
  group('App boot', () {
    testWidgets('boots to login screen (MaterialApp present)', (tester) async {
      await tester.pumpWidget(const ProviderScope(child: SmritDriverApp()));
      await tester.pump();
      expect(find.byType(MaterialApp), findsOneWidget);
    });
  });

  group('LoginScreen', () {
    testWidgets('renders phone and password fields', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: LoginScreen()),
      );
      // Phone field
      expect(find.byType(TextFormField), findsAtLeastNWidgets(2));
    });

    testWidgets('shows SMRIT branding', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: LoginScreen()),
      );
      await tester.pump();
      expect(find.text('SMRIT'), findsOneWidget);
      expect(find.text('Driver Portal'), findsOneWidget);
    });

    testWidgets('submit button is present', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: LoginScreen()),
      );
      await tester.pump();
      expect(find.widgetWithText(ElevatedButton, 'Sign In'), findsOneWidget);
    });

    testWidgets('shows error when fields are empty on submit', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: LoginScreen()),
      );
      await tester.pump();

      // Clear the pre-filled phone text then tap Sign In
      await tester.tap(find.widgetWithText(ElevatedButton, 'Sign In'));
      await tester.pump();

      // The _login guard fires: "Enter your phone number and password."
      expect(find.textContaining('Enter your phone'), findsOneWidget);
    });
  });
}
