import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/theme/app_theme.dart';
import 'core/services/alarm_service.dart';
import 'providers/auth_provider.dart';
import 'providers/activities_provider.dart';
import 'providers/finances_provider.dart';
import 'modules/auth/views/login_view.dart';
import 'modules/main_shell/views/main_shell_view.dart';
import 'modules/alarm/views/alarm_screen_view.dart';

final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Inicializar servicio de alarmas y notificaciones
  final alarmService = AlarmService();
  await alarmService.initialize(
    onAlarmClick: (activityId) {
      if (activityId != null) {
        // Al tocar la notificación, abrir pantalla de alarma a pantalla completa
        final context = navigatorKey.currentContext;
        if (context != null) {
          final provider = context.read<ActivitiesProvider>();
          final match = provider.activities.where((a) => a.id == activityId);
          if (match.isNotEmpty) {
            navigatorKey.currentState?.push(
              MaterialPageRoute(
                builder: (_) => AlarmScreenView(activity: match.first),
                fullscreenDialog: true,
              ),
            );
          }
        }
      }
    },
  );

  runApp(const ProyecAhorroMobileApp());
}

class ProyecAhorroMobileApp extends StatelessWidget {
  const ProyecAhorroMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()..checkAuth()),
        ChangeNotifierProvider(create: (_) => ActivitiesProvider()),
        ChangeNotifierProvider(create: (_) => FinancesProvider()),
      ],
      child: MaterialApp(
        navigatorKey: navigatorKey,
        title: 'ProyecAhorro',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.darkTheme,
        home: const RootGateView(),
      ),
    );
  }
}

class RootGateView extends StatelessWidget {
  const RootGateView({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    if (auth.isLoading) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(color: AppTheme.primary),
        ),
      );
    }

    if (auth.isAuthenticated) {
      return const MainShellView();
    }

    return const LoginView();
  }
}

