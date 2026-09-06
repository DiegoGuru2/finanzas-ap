import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../../providers/auth_provider.dart';
import '../../../providers/finances_provider.dart';
import '../../../providers/activities_provider.dart';
import '../../dashboard/views/dashboard_view.dart';
import '../../debts/views/debts_view.dart';
import '../../expenses/views/expenses_view.dart';
import '../../incomes/views/incomes_view.dart';
import '../../activities/views/activities_list_view.dart';

class MainShellView extends StatefulWidget {
  const MainShellView({super.key});

  @override
  State<MainShellView> createState() => _MainShellViewState();
}

class _MainShellViewState extends State<MainShellView> {
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<FinancesProvider>().fetchAll();
      context.read<ActivitiesProvider>().fetchActivities();
    });
  }

  void _onSelectTab(int index) {
    setState(() => _currentIndex = index);
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final act = context.watch<ActivitiesProvider>();
    final pendingMedsCount = act.medications.where((m) => !m.isCompleted).length;

    final pages = [
      DashboardView(onNavigateTab: _onSelectTab),
      const DebtsView(),
      const ExpensesView(),
      const IncomesView(),
      const ActivitiesListView(),
    ];

    return Scaffold(
      appBar: _currentIndex == 0
          ? AppBar(
              title: Row(
                children: [
                  Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [AppTheme.primary, AppTheme.secondary],
                      ),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.shield_rounded, size: 18, color: Colors.white),
                  ),
                  const SizedBox(width: 10),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('ProyecAhorro', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
                      Text(
                        auth.userEmail ?? 'Usuario',
                        style: const TextStyle(fontSize: 10, color: AppTheme.textMuted),
                      ),
                    ],
                  ),
                ],
              ),
              actions: [
                IconButton(
                  tooltip: 'Cerrar Sesión',
                  icon: const Icon(Icons.logout_rounded, color: AppTheme.danger, size: 20),
                  onPressed: () => auth.logout(),
                ),
              ],
            )
          : null,
      body: IndexedStack(
        index: _currentIndex,
        children: pages,
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
