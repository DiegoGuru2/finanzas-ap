import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiClient {
  static const String defaultBaseUrl = 'https://finanzas-ap-black.vercel.app';
  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;

  late final Dio dio;
  final FlutterSecureStorage storage = const FlutterSecureStorage();

  ApiClient._internal() {
    dio = Dio(
      BaseOptions(
        baseUrl: defaultBaseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final cookie = await storage.read(key: 'auth_cookie');
          if (cookie != null && cookie.isNotEmpty) {
            options.headers['Cookie'] = cookie;
          }
          final token = await storage.read(key: 'auth_token');
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onResponse: (response, handler) async {
          // Guardar cookies de sesión si el backend las envía
          final setCookie = response.headers['set-cookie'];
          if (setCookie != null && setCookie.isNotEmpty) {
            final cookieString = setCookie.join('; ');
            await storage.write(key: 'auth_cookie', value: cookieString);
          }
          return handler.next(response);
        },
      ),
    );
  }

  // Auth: Iniciar Sesión con Better Auth
  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final response = await dio.post(
        '/api/auth/sign-in/email',
        data: {
          'email': email,
          'password': password,
        },
      );

      final data = response.data;
      if (data is Map<String, dynamic> && data['token'] != null) {
        await storage.write(key: 'auth_token', value: data['token'].toString());
      }
      return data is Map<String, dynamic> ? data : {'success': true};
    } on DioException catch (e) {
      final msg = e.response?.data?['message'] ?? e.response?.data?['error'] ?? 'Error al iniciar sesión';
      throw Exception(msg);
    }
  }

  // Actividades: Obtener lista
  Future<List<Map<String, dynamic>>> getActivities() async {
    try {
      final response = await dio.get('/api/activities');
      final data = response.data['data'] as List<dynamic>? ?? [];
      return data.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    } on DioException catch (e) {
      throw Exception(e.response?.data?['error'] ?? 'Error al cargar actividades');
    }
  }

  // Actividades: Crear nueva
  Future<String> createActivity(Map<String, dynamic> activityData) async {
    try {
      final response = await dio.post('/api/activities', data: activityData);
      return response.data['id'] as String? ?? '';
    } on DioException catch (e) {
      throw Exception(e.response?.data?['error'] ?? 'Error al crear actividad');
    }
  }

  // Actividades: Actualizar / Marcar completada
  Future<void> updateActivity(Map<String, dynamic> updateData) async {
    try {
      await dio.put('/api/activities', data: updateData);
    } on DioException catch (e) {
      throw Exception(e.response?.data?['error'] ?? 'Error al actualizar actividad');
    }
  }

  // Actividades: Eliminar
  Future<void> deleteActivity(String id) async {
    try {
      await dio.delete('/api/activities', queryParameters: {'id': id});
    } on DioException catch (e) {
      throw Exception(e.response?.data?['error'] ?? 'Error al eliminar actividad');
    }
  }

  // ─── Módulo Financiero ───

  // Dashboard: Resumen financiero completo
  Future<Map<String, dynamic>> getDashboard() async {
    try {
      final response = await dio.get('/api/dashboard');
      return Map<String, dynamic>.from(response.data['data'] as Map);
    } on DioException catch (e) {
      throw Exception(e.response?.data?['error'] ?? 'Error al cargar dashboard');
    }
  }

  // Deudas
  Future<List<Map<String, dynamic>>> getDebts() async {
    try {
      final response = await dio.get('/api/debts');
      final list = response.data['data'] as List<dynamic>? ?? [];
      return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    } on DioException catch (e) {
      throw Exception(e.response?.data?['error'] ?? 'Error al cargar deudas');
    }
  }

  Future<void> createDebt(Map<String, dynamic> data) async {
    try {
      await dio.post('/api/debts', data: data);
    } on DioException catch (e) {
      throw Exception(e.response?.data?['error'] ?? 'Error al registrar deuda');
    }
  }

  Future<void> deleteDebt(String id) async {
    try {
      await dio.delete('/api/debts', queryParameters: {'id': id});
    } on DioException catch (e) {
      throw Exception(e.response?.data?['error'] ?? 'Error al eliminar deuda');
    }
  }

  // Gastos
  Future<List<Map<String, dynamic>>> getExpenses() async {
    try {
      final response = await dio.get('/api/expenses');
      final list = response.data['data'] as List<dynamic>? ?? [];
      return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    } on DioException catch (e) {
      throw Exception(e.response?.data?['error'] ?? 'Error al cargar gastos');
    }
  }

  Future<void> createExpense(Map<String, dynamic> data) async {
    try {
      await dio.post('/api/expenses', data: data);
    } on DioException catch (e) {
      throw Exception(e.response?.data?['error'] ?? 'Error al registrar gasto');
    }
  }

  Future<void> deleteExpense(String id) async {
    try {
      await dio.delete('/api/expenses', queryParameters: {'id': id});
    } on DioException catch (e) {
      throw Exception(e.response?.data?['error'] ?? 'Error al eliminar gasto');
    }
  }

  // Ingresos
  Future<List<Map<String, dynamic>>> getIncomes() async {
    try {
      final response = await dio.get('/api/incomes');
      final list = response.data['data'] as List<dynamic>? ?? [];
      return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    } on DioException catch (e) {
      throw Exception(e.response?.data?['error'] ?? 'Error al cargar ingresos');
    }
  }

  Future<void> createIncome(Map<String, dynamic> data) async {
    try {
      await dio.post('/api/incomes', data: data);
    } on DioException catch (e) {
      throw Exception(e.response?.data?['error'] ?? 'Error al registrar ingreso');
    }
  }

  Future<void> deleteIncome(String id) async {
    try {
      await dio.delete('/api/incomes', queryParameters: {'id': id});
    } on DioException catch (e) {
      throw Exception(e.response?.data?['error'] ?? 'Error al eliminar ingreso');
    }
  }

  // Metas de Ahorro
  Future<List<Map<String, dynamic>>> getSavings() async {
    try {
      final response = await dio.get('/api/savings');
      final list = response.data['data'] as List<dynamic>? ?? [];
      return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    } on DioException catch (e) {
      throw Exception(e.response?.data?['error'] ?? 'Error al cargar metas');
    }
  }

  Future<void> createSavingsGoal(Map<String, dynamic> data) async {
    try {
      await dio.post('/api/savings', data: data);
    } on DioException catch (e) {
      throw Exception(e.response?.data?['error'] ?? 'Error al registrar meta');
    }
  }

  Future<void> deleteSavingsGoal(String id) async {
    try {
      await dio.delete('/api/savings', queryParameters: {'id': id});
    } on DioException catch (e) {
      throw Exception(e.response?.data?['error'] ?? 'Error al eliminar meta');
    }
  }
}

