import 'package:flutter/material.dart';
import '../core/api/api_client.dart';

class FinancesProvider extends ChangeNotifier {
  final ApiClient _apiClient = ApiClient();

  Map<String, dynamic>? _dashboardData;
  List<Map<String, dynamic>> _debts = [];
  List<Map<String, dynamic>> _expenses = [];
  List<Map<String, dynamic>> _incomes = [];
  List<Map<String, dynamic>> _savingsGoals = [];

  bool _isLoading = false;
  String? _errorMessage;

  Map<String, dynamic>? get dashboardData => _dashboardData;
  List<Map<String, dynamic>> get debts => _debts;
  List<Map<String, dynamic>> get expenses => _expenses;
  List<Map<String, dynamic>> get incomes => _incomes;
  List<Map<String, dynamic>> get savingsGoals => _savingsGoals;

  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  // ─── Métricas calculadas del Dashboard (clave 'summary') ───
  Map<String, dynamic> get summary =>
      (_dashboardData?['summary'] as Map<String, dynamic>?) ?? {};

  double get netIncome =>
      (summary['totalNetIncome'] as num?)?.toDouble() ?? 0.0;
  double get grossIncome =>
      (summary['totalGrossIncome'] as num?)?.toDouble() ?? 0.0;
  double get iessDeductions =>
      (summary['totalIessDeductions'] as num?)?.toDouble() ?? 0.0;
  double get benefitsMonthly =>
      (summary['totalBenefitsMonthly'] as num?)?.toDouble() ?? 0.0;

  double get quincenaAvailable =>
      (summary['quincenaAvailable'] as num?)?.toDouble() ?? 0.0;
  double get finDeMesAvailable =>
      (summary['finDeMesAvailable'] as num?)?.toDouble() ?? 0.0;
  double get programmedSavings =>
      (summary['totalProgrammedSavings'] as num?)?.toDouble() ?? 0.0;

  double get totalExpenses =>
      (summary['totalExpenses'] as num?)?.toDouble() ?? 0.0;
  double get totalMinimumPayments =>
      (summary['totalMinimumPayments'] as num?)?.toDouble() ?? 0.0;
  double get surplus =>
      (summary['surplus'] as num?)?.toDouble() ?? 0.0;
  String get status =>
      (summary['status'] as String?) ?? 'healthy';

  double get totalDebt =>
      (summary['totalDebt'] as num?)?.toDouble() ?? 0.0;
  double get totalOriginalDebt =>
      (summary['totalOriginalDebt'] as num?)?.toDouble() ?? 0.0;
  double get totalDebtPaidOff =>
      (summary['totalDebtPaidOff'] as num?)?.toDouble() ?? 0.0;
  double get totalDebtProgress =>
      (summary['totalDebtProgress'] as num?)?.toDouble() ?? 0.0;
  int get activeDebtsCount =>
      (summary['activeDebtsCount'] as num?)?.toInt() ?? 0;
  int get paidOffDebtsCount =>
      (summary['paidOffDebtsCount'] as num?)?.toInt() ?? 0;

  double get totalSaved =>
      (summary['totalSaved'] as num?)?.toDouble() ?? 0.0;
  double get totalSavingsTarget =>
      (summary['totalSavingsTarget'] as num?)?.toDouble() ?? 0.0;
  double get savingsProgress =>
      (summary['savingsProgress'] as num?)?.toDouble() ?? 0.0;
  double get totalMonthlySavingsContribution =>
      (summary['totalMonthlySavingsContribution'] as num?)?.toDouble() ?? 0.0;

  List<Map<String, dynamic>> get expensesByCategory {
    final list = _dashboardData?['expensesByCategory'] as List<dynamic>? ?? [];
    return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  DateTime? _lastFetchTime;

  /// Cargar todo el resumen con rescates resilientes (paralelo + throttle)
  Future<void> fetchAll({bool force = false}) async {
    // Throttle: no re-cargar si se hizo hace menos de 2 segundos
    final now = DateTime.now();
    if (!force && _lastFetchTime != null && now.difference(_lastFetchTime!).inSeconds < 2) {
      return;
    }
    if (_isLoading) return; // Evitar llamadas concurrentes

    _isLoading = true;
    _errorMessage = null;
    _lastFetchTime = now;
    notifyListeners();

    try {
      // Ejecutar Dashboard primero (es el más importante)
      try {
        _dashboardData = await _apiClient.getDashboard();
      } catch (e) {
        debugPrint('[FinancesProvider] getDashboard error: $e');
        _errorMessage = e.toString().replaceAll('Exception: ', '');
      }

      // Ejecutar el resto en paralelo para velocidad
      final results = await Future.wait([
        _apiClient.getDebts().catchError((e) {
          debugPrint('[FinancesProvider] getDebts error: $e');
          return <Map<String, dynamic>>[];
        }),
        _apiClient.getExpenses().catchError((e) {
          debugPrint('[FinancesProvider] getExpenses error: $e');
          return <Map<String, dynamic>>[];
        }),
        _apiClient.getIncomes().catchError((e) {
          debugPrint('[FinancesProvider] getIncomes error: $e');
          return <Map<String, dynamic>>[];
        }),
        _apiClient.getSavings().catchError((e) {
          debugPrint('[FinancesProvider] getSavings error: $e');
          return <Map<String, dynamic>>[];
        }),
      ]);

      if (results[0].isNotEmpty || _debts.isEmpty) _debts = results[0];
      if (results[1].isNotEmpty || _expenses.isEmpty) _expenses = results[1];
      if (results[2].isNotEmpty || _incomes.isEmpty) _incomes = results[2];
      if (results[3].isNotEmpty || _savingsGoals.isEmpty) _savingsGoals = results[3];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // ─── Sueldo / Configuración Principal ───
  Future<void> saveSalarySettings(Map<String, dynamic> salaryData) async {
    final principal = _incomes.firstWhere(
      (i) => i['isSalary'] == true,
      orElse: () => {},
    );
    if (principal.isNotEmpty && principal['id'] != null) {
      salaryData['id'] = principal['id'];
      await _apiClient.updateIncome(salaryData);
    } else {
      await _apiClient.createIncome(salaryData);
    }
    await fetchAll();
  }

  // ─── Operaciones de Deudas ───
  Future<void> addDebt(Map<String, dynamic> data) async {
    await _apiClient.createDebt(data);
    await fetchAll();
  }

  Future<void> deleteDebt(String id) async {
    await _apiClient.deleteDebt(id);
    _debts.removeWhere((d) => d['id'] == id);
    notifyListeners();
  }

  // ─── Operaciones de Gastos ───
  Future<void> addExpense(Map<String, dynamic> data) async {
    await _apiClient.createExpense(data);
    await fetchAll();
  }

  Future<void> deleteExpense(String id) async {
    await _apiClient.deleteExpense(id);
    _expenses.removeWhere((e) => e['id'] == id);
    notifyListeners();
  }

  // ─── Operaciones de Ingresos ───
  Future<void> addIncome(Map<String, dynamic> data) async {
    await _apiClient.createIncome(data);
    await fetchAll();
  }

  Future<void> deleteIncome(String id) async {
    await _apiClient.deleteIncome(id);
    _incomes.removeWhere((i) => i['id'] == id);
    notifyListeners();
  }

  // ─── Operaciones de Metas de Ahorro ───
  Future<void> addSavingsGoal(Map<String, dynamic> data) async {
    await _apiClient.createSavingsGoal(data);
    await fetchAll();
  }

  Future<void> deleteSavingsGoal(String id) async {
    await _apiClient.deleteSavingsGoal(id);
    _savingsGoals.removeWhere((s) => s['id'] == id);
    notifyListeners();
  }
}
