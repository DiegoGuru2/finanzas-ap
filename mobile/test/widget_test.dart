import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/main.dart';

void main() {
  testWidgets('App initializes smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const ProyecAhorroMobileApp());
    expect(find.byType(ProyecAhorroMobileApp), findsOneWidget);
  });
}
