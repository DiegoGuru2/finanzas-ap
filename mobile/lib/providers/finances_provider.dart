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

  // Métricas rápidas del Dashboard
  double get netIncome => (_dashboardData?['metrics']?['netMonthlyIncome'] as num?)?.toDouble() ?? 0.0;
  double get totalExpenses => (_dashboardData?['metrics']?['totalExpenses'] as num?)?.toDouble() ?? 0.0;
  double get totalMinimumPayments => (_dashboardData?['metrics']?['totalMinimumPayments'] as num?)?.toDouble() ?? 0.0;
  double get surplus => (_dashboardData?['metrics']?['surplus'] as num?)?.toDouble() ?? 0.0;
  double get totalSaved => (_dashboardData?['metrics']?['totalSaved'] as num?)?.toDouble() ?? 0.0;
  int get activeDebtsCount => (_dashboardData?['metrics']?['activeDebtsCount'] as num?)?.toInt() ?? 0;

  /// Cargar todo el resumen inicial
  Future<void> fetchAll() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final results = await Future.wait([
        _apiClient.getDashboard(),
        _apiClient.getDebts(),
        _apiClient.getExpenses(),
        _apiClient.getIncomes(),
        _apiClient.getSavings(),
      ]);

      _dashboardData = results[0] as Map<String, dynamic>;
      _debts = results[1] as List<Map<String, dynamic>>;
      _expenses = results[2] as List<Map<String, dynamic>>;
      _incomes = results[3] as List<Map<String, dynamic>>;
      _savingsGoals = results[4] as List<Map<String, dynamic>>;
    } catch (e) {
      _errorMessage = e.toString().replaceAll('Exception: ', '');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
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
