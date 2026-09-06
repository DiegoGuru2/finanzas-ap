import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../core/api/api_client.dart';
import '../core/services/biometric_service.dart';

class AuthProvider extends ChangeNotifier {
  final ApiClient _apiClient = ApiClient();
  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  final BiometricService _bioService = BiometricService();

  bool _isAuthenticated = false;
  bool _isLoading = false;
  bool _isBiometricAvailable = false;
  bool _isBiometricEnabled = false;

  String? _userEmail;
  String? _userName;
  String? _errorMessage;

  bool get isAuthenticated => _isAuthenticated;
  bool get isLoading => _isLoading;
  bool get isBiometricAvailable => _isBiometricAvailable;
  bool get isBiometricEnabled => _isBiometricEnabled;
  String? get userEmail => _userEmail;
  String? get userName => _userName;
  String? get errorMessage => _errorMessage;

  Future<void> checkAuth() async {
    _isLoading = true;
    notifyListeners();

    _isBiometricAvailable = await _bioService.isBiometricAvailable();
    _isBiometricEnabled = await _bioService.isBiometricEnabled();

    final token = await _storage.read(key: 'auth_token');
    final cookie = await _storage.read(key: 'auth_cookie');

    if ((token != null && token.isNotEmpty) || (cookie != null && cookie.isNotEmpty)) {
      _isAuthenticated = true;
      _userEmail = await _storage.read(key: 'user_email');
      _userName = await _storage.read(key: 'user_name');
    } else {
      _isAuthenticated = false;
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<bool> login(String email, String password, {bool enableBiometrics = false}) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await _apiClient.login(email, password);
      _isAuthenticated = true;
      _userEmail = email;
      _userName = res['user']?['name'] ?? email.split('@').first;

      await _storage.write(key: 'user_email', value: _userEmail);
      if (_userName != null) {
        await _storage.write(key: 'user_name', value: _userName!);
      }

      if (enableBiometrics && _isBiometricAvailable) {
        await _bioService.setBiometricEnabled(true, email: email, password: password);
        _isBiometricEnabled = true;
      }

      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Iniciar sesión automáticamente usando la huella dactilar guardada
  Future<bool> loginWithBiometrics() async {
    if (!_isBiometricAvailable || !_isBiometricEnabled) return false;

    final authenticated = await _bioService.authenticate(
      reason: 'Desbloquea ProyecAhorro con tu huella dactilar',
    );

    if (!authenticated) return false;

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    // 1. Si ya tenemos token o cookie de sesión guardado, restaurar sesión directamente
    final token = await _storage.read(key: 'auth_token');
    final cookie = await _storage.read(key: 'auth_cookie');
    if ((token != null && token.isNotEmpty) || (cookie != null && cookie.isNotEmpty)) {
      _isAuthenticated = true;
      _userEmail = await _storage.read(key: 'user_email');
      _userName = await _storage.read(key: 'user_name');
      _isLoading = false;
      notifyListeners();
      return true;
    }

    // 2. Si expiró, usar credenciales guardadas en el baúl biométrico
    final creds = await _bioService.getSavedCredentials();
    if (creds != null && creds['email'] != null && creds['password'] != null) {
      return await login(creds['email']!, creds['password']!);
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  Future<void> setBiometrics(bool enabled, {String? email, String? password}) async {
    await _bioService.setBiometricEnabled(enabled, email: email, password: password);
    _isBiometricEnabled = await _bioService.isBiometricEnabled();
    notifyListeners();
  }

  Future<void> logout() async {
    // Preservar estado biométrico si el usuario lo activó
    final bioEnabled = await _bioService.isBiometricEnabled();
    final bioEmail = await _storage.read(key: 'biometric_saved_email');
    final bioPass = await _storage.read(key: 'biometric_saved_password');

    await _storage.deleteAll();

    if (bioEnabled && bioEmail != null && bioPass != null) {
      await _bioService.setBiometricEnabled(true, email: bioEmail, password: bioPass);
    }

    _isAuthenticated = false;
    _userEmail = null;
    _userName = null;
    notifyListeners();
  }
}
