import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../core/api/api_client.dart';

class AuthProvider extends ChangeNotifier {
  final ApiClient _apiClient = ApiClient();
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  bool _isAuthenticated = false;
  bool _isLoading = false;
  String? _userEmail;
  String? _userName;
  String? _errorMessage;

  bool get isAuthenticated => _isAuthenticated;
  bool get isLoading => _isLoading;
  String? get userEmail => _userEmail;
  String? get userName => _userName;
  String? get errorMessage => _errorMessage;

  Future<void> checkAuth() async {
    _isLoading = true;
    notifyListeners();

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

  Future<bool> login(String email, String password) async {
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

  Future<void> logout() async {
    await _storage.deleteAll();
    _isAuthenticated = false;
    _userEmail = null;
    _userName = null;
    notifyListeners();
  }
}
