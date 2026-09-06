import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/services/financial_notification_service.dart';
import '../../../providers/auth_provider.dart';
import '../../../providers/finances_provider.dart';
import '../../../providers/activities_provider.dart';
import '../../dashboard/views/dashboard_view.dart';
import '../../debts/views/debts_view.dart';
import '../../expenses/views/expenses_view.dart';
import '../../incomes/views/incomes_view.dart';
import '../../activities/views/activities_list_view.dart';
import '../../settings/views/settings_view.dart';
import '../../permissions/views/permissions_view.dart';

class MainShellView extends StatefulWidget {
  const MainShellView({super.key});

  @override
  State<MainShellView> createState() => _MainShellViewState();
}

class _MainShellViewState extends State<MainShellView> {
  int _currentIndex = 0;

  // Cache de páginas ya visitadas para evitar reconstrucciones,
  // pero sin mantener todas en memoria desde el inicio (no IndexedStack)
  final Map<int, Widget> _pageCache = {};

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final finances = context.read<FinancesProvider>();
      final activities = context.read<ActivitiesProvider>();

      // Cargar datos en paralelo
      await Future.wait([
        finances.fetchAll(),
        activities.fetchActivities(),
      ]);

      // Programar notificaciones financieras con los datos frescos
      FinancialNotificationService().scheduleFinancialNotifications();
    });
  }

  void _onSelectTab(int index) {
    setState(() => _currentIndex = index);
  }

  Widget _buildPage(int index) {
    // Cachear la página una vez construida
    return _pageCache.putIfAbsent(index, () {
      switch (index) {
        case 0:
          return DashboardView(onNavigateTab: _onSelectTab);
        case 1:
          return const DebtsView();
        case 2:
          return const ExpensesView();
        case 3:
          return const IncomesView();
        case 4:
          return const ActivitiesListView();
        default:
          return DashboardView(onNavigateTab: _onSelectTab);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final act = context.watch<ActivitiesProvider>();
    final pendingMedsCount = act.medications.where((m) => !m.isCompleted).length;

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              width: 34,
              height: 34,
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: AppTheme.surfaceElevated,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppTheme.border),
              ),
              child: Image.asset(
                'assets/images/logo-icon.png',
                fit: BoxFit.contain,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  RichText(
                    text: const TextSpan(
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Colors.white),
                      children: [
                        TextSpan(text: 'Proyec'),
                        TextSpan(text: 'Ahorro', style: TextStyle(color: AppTheme.secondary)),
                      ],
                    ),
                  ),
                  Text(
                    auth.userEmail ?? 'Usuario',
                    style: const TextStyle(fontSize: 10, color: AppTheme.textMuted),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Configuración',
            icon: const Icon(Icons.settings_outlined, color: AppTheme.primaryLight, size: 22),
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const SettingsView()),
              );
            },
          ),
          IconButton(
            tooltip: 'Cerrar Sesión',
            icon: const Icon(Icons.logout_rounded, color: AppTheme.danger, size: 20),
            onPressed: () => auth.logout(),
          ),
        ],
      ),
      drawer: Drawer(
        backgroundColor: AppTheme.surface,
        child: SafeArea(
          child: Column(
            children: [
              UserAccountsDrawerHeader(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFF1E1B4B), Color(0xFF0F172A)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                accountName: Text(
                  auth.userName ?? 'Usuario ProyecAhorro',
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                ),
                accountEmail: Text(auth.userEmail ?? ''),
                currentAccountPicture: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: AppTheme.surfaceElevated,
                    shape: BoxShape.circle,
                    border: Border.all(color: AppTheme.secondary.withValues(alpha: 0.5), width: 2),
                  ),
                  child: ClipOval(
                    child: Image.asset(
                      'assets/images/logo-icon.png',
                      fit: BoxFit.contain,
                    ),
                  ),
                ),
              ),
              ListTile(
                leading: const Icon(Icons.dashboard_rounded, color: AppTheme.primaryLight),
                title: const Text('Dashboard'),
                onTap: () {
                  Navigator.pop(context);
                  _onSelectTab(0);
                },
              ),
              ListTile(
                leading: const Icon(Icons.credit_card_rounded, color: AppTheme.primaryLight),
                title: const Text('Deudas & Créditos'),
                onTap: () {
                  Navigator.pop(context);
                  _onSelectTab(1);
                },
              ),
              ListTile(
                leading: const Icon(Icons.receipt_long_rounded, color: AppTheme.primaryLight),
                title: const Text('Gastos Mensuales'),
                onTap: () {
                  Navigator.pop(context);
                  _onSelectTab(2);
                },
              ),
              ListTile(
                leading: const Icon(Icons.account_balance_wallet_rounded, color: AppTheme.primaryLight),
                title: const Text('Ingresos'),
                onTap: () {
                  Navigator.pop(context);
                  _onSelectTab(3);
                },
              ),
              ListTile(
                leading: const Icon(Icons.alarm_rounded, color: AppTheme.primaryLight),
                title: const Text('Agenda & Medicamentos'),
                trailing: pendingMedsCount > 0
                    ? Badge(label: Text('$pendingMedsCount'), backgroundColor: AppTheme.danger)
                    : null,
                onTap: () {
                  Navigator.pop(context);
                  _onSelectTab(4);
                },
              ),
              const Divider(color: Colors.white10),
              ListTile(
                leading: const Icon(Icons.tune_rounded, color: AppTheme.secondary),
                title: const Text('Configuración Financiera', style: TextStyle(fontWeight: FontWeight.w700)),
                subtitle: const Text('Sueldo, IESS, Décimos y Beneficios', style: TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                onTap: () {
                  Navigator.pop(context);
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const SettingsView()),
                  );
                },
              ),
              ListTile(
                leading: const Icon(Icons.fingerprint_rounded, color: AppTheme.primaryLight),
                title: const Text('Huella & Permisos de Alarma', style: TextStyle(fontWeight: FontWeight.w700)),
                subtitle: const Text('Seguridad, huella dactilar y notificaciones', style: TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                onTap: () {
                  Navigator.pop(context);
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const PermissionsView()),
                  );
                },
              ),
              const Spacer(),
              const Divider(color: Colors.white10),
              ListTile(
                leading: const Icon(Icons.logout_rounded, color: AppTheme.danger),
                title: const Text('Cerrar Sesión', style: TextStyle(color: AppTheme.danger)),
                onTap: () {
                  Navigator.pop(context);
                  auth.logout();
                },
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Image.asset('assets/images/logo-icon.png', width: 14, height: 14),
                    const SizedBox(width: 6),
                    const Text('ProyecAhorro · Por DG design', style: TextStyle(fontSize: 10, color: AppTheme.textMuted)),
                  ],
                ),
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
      // Lazy loading: solo construye la página activa (cachea las visitadas)
      body: AnimatedSwitcher(
        duration: const Duration(milliseconds: 200),
        switchInCurve: Curves.easeOut,
        switchOutCurve: Curves.easeIn,
        child: KeyedSubtree(
          key: ValueKey(_currentIndex),
          child: _buildPage(_currentIndex),
        ),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: _onSelectTab,
        backgroundColor: AppTheme.surface,
        indicatorColor: AppTheme.primary.withValues(alpha: 0.25),
        destinations: [
          const NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard_rounded, color: AppTheme.primaryLight),
            label: 'Inicio',
          ),
          const NavigationDestination(
            icon: Icon(Icons.credit_card_outlined),
            selectedIcon: Icon(Icons.credit_card_rounded, color: AppTheme.primaryLight),
            label: 'Deudas',
          ),
          const NavigationDestination(
            icon: Icon(Icons.receipt_long_outlined),
            selectedIcon: Icon(Icons.receipt_long_rounded, color: AppTheme.primaryLight),
            label: 'Gastos',
          ),
          const NavigationDestination(
            icon: Icon(Icons.account_balance_wallet_outlined),
            selectedIcon: Icon(Icons.account_balance_wallet_rounded, color: AppTheme.primaryLight),
            label: 'Ingresos',
          ),
          NavigationDestination(
            icon: Badge(
              isLabelVisible: pendingMedsCount > 0,
              label: Text('$pendingMedsCount'),
              backgroundColor: AppTheme.danger,
              child: const Icon(Icons.alarm_outlined),
            ),
            selectedIcon: Badge(
              isLabelVisible: pendingMedsCount > 0,
              label: Text('$pendingMedsCount'),
              backgroundColor: AppTheme.danger,
              child: const Icon(Icons.alarm_rounded, color: AppTheme.primaryLight),
            ),
            label: 'Agenda',
          ),
        ],
      ),
    );
  }
}
