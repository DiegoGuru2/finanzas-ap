import 'package:flutter/services.dart';
import 'package:local_auth/local_auth.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class BiometricService {
  static final BiometricService _instance = BiometricService._internal();
  factory BiometricService() => _instance;
  BiometricService._internal();

  final LocalAuthentication _auth = LocalAuthentication();
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  static const String _biometricEnabledKey = 'biometric_enabled';
  static const String _savedEmailKey = 'biometric_saved_email';
  static const String _savedPasswordKey = 'biometric_saved_password';

  /// Verifica si el hardware soporta biometría y si está configurada en el celular
  Future<bool> isBiometricAvailable() async {
    try {
      final bool canAuthenticateWithBiometrics = await _auth.canCheckBiometrics;
      final bool canAuthenticate = canAuthenticateWithBiometrics || await _auth.isDeviceSupported();
      return canAuthenticate;
    } on PlatformException {
      return false;
    }
  }

  /// Lista de tipos de biometría disponibles (huella, rostro, etc.)
  Future<List<BiometricType>> getAvailableBiometrics() async {
    try {
      return await _auth.getAvailableBiometrics();
    } on PlatformException {
      return [];
    }
  }

  /// Comprueba si el usuario tiene activado el inicio de sesión con huella
  Future<bool> isBiometricEnabled() async {
    final value = await _storage.read(key: _biometricEnabledKey);
    return value == 'true';
  }

  /// Activa o desactiva el inicio de sesión con huella guardando credenciales de forma segura
  Future<bool> setBiometricEnabled(bool enabled, {String? email, String? password}) async {
    if (enabled) {
      // Pedir confirmación con huella antes de activarlo
      final authenticated = await authenticate(
        reason: 'Verifica tu huella dactilar para activar el acceso biométrico',
      );
      if (!authenticated) return false;

      await _storage.write(key: _biometricEnabledKey, value: 'true');
      if (email != null && password != null) {
        await _storage.write(key: _savedEmailKey, value: email);
        await _storage.write(key: _savedPasswordKey, value: password);
      }
      return true;
    } else {
      await _storage.delete(key: _biometricEnabledKey);
      await _storage.delete(key: _savedPasswordKey);
      return true;
    }
  }

  /// Obtiene las credenciales guardadas para el login biométrico
  Future<Map<String, String>?> getSavedCredentials() async {
    final enabled = await isBiometricEnabled();
    if (!enabled) return null;

    final email = await _storage.read(key: _savedEmailKey);
    final password = await _storage.read(key: _savedPasswordKey);

    if (email != null && password != null) {
      return {'email': email, 'password': password};
    }
    return null;
  }

  /// Ejecuta el diálogo nativo de autenticación por huella / rostro del celular
  Future<bool> authenticate({required String reason}) async {
    try {
      return await _auth.authenticate(
        localizedReason: reason,
        options: const AuthenticationOptions(
          stickyAuth: true,
          biometricOnly: false,
          useErrorDialogs: true,
        ),
      );
    } on PlatformException {
      return false;
    }
  }
}
