import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../providers/auth_provider.dart';
import '../../../core/theme/app_theme.dart';

class LoginView extends StatefulWidget {
  const LoginView({super.key});

  @override
  State<LoginView> createState() => _LoginViewState();
}

class _LoginViewState extends State<LoginView> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController(text: 'diego@finanzas.app');
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;
  bool _enableBiometrics = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = context.read<AuthProvider>();
      if (auth.isBiometricEnabled) {
        auth.loginWithBiometrics();
      }
    });
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final auth = context.read<AuthProvider>();
    final success = await auth.login(
      _emailController.text.trim(),
      _passwordController.text,
      enableBiometrics: _enableBiometrics,
    );

    if (!success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppTheme.danger,
          content: Text(auth.errorMessage ?? 'Error de autenticación'),
        ),
      );
    }
  }

  void _loginBiometric() async {
    final auth = context.read<AuthProvider>();
    final success = await auth.loginWithBiometrics();
    if (!success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: AppTheme.danger,
          content: Text('No se pudo autenticar con huella dactilar. Ingresa con tu contraseña.'),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 32),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Logo Oficial ProyecAhorro de la Web
                  Container(
                    width: 76,
                    height: 76,
                    decoration: BoxDecoration(
                      color: AppTheme.surfaceElevated,
                      borderRadius: BorderRadius.circular(22),
                      border: Border.all(color: AppTheme.border),
                      boxShadow: [
                        BoxShadow(
                          color: AppTheme.primary.withValues(alpha: 0.25),
                          blurRadius: 20,
                          offset: const Offset(0, 6),
                        ),
                      ],
                    ),
                    padding: const EdgeInsets.all(10),
                    child: Image.asset(
                      'assets/images/logo-icon.png',
                      fit: BoxFit.contain,
                    ),
                  ),
                  const SizedBox(height: 18),

                  RichText(
                    text: const TextSpan(
                      style: TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                        letterSpacing: -0.5,
                      ),
                      children: [
                        TextSpan(text: 'Proyec'),
                        TextSpan(text: 'Ahorro', style: TextStyle(color: AppTheme.secondary)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Gestiona hoy, proyecta tu mañana',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 12,
                      color: AppTheme.textMuted,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 32),

                  // Botón Biométrico si ya está configurado
                  if (auth.isBiometricEnabled) ...[
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppTheme.secondary,
                          side: const BorderSide(color: AppTheme.secondary, width: 1.5),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          backgroundColor: AppTheme.secondary.withValues(alpha: 0.08),
                        ),
                        onPressed: auth.isLoading ? null : _loginBiometric,
                        icon: const Icon(Icons.fingerprint_rounded, size: 26),
                        label: const Text(
                          'Desbloquear con Huella Dactilar',
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    const Row(
                      children: [
                        Expanded(child: Divider(color: Colors.white12)),
                        Padding(
                          padding: EdgeInsets.symmetric(horizontal: 12),
                          child: Text('o ingresa con tu clave', style: TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                        ),
                        Expanded(child: Divider(color: Colors.white12)),
                      ],
                    ),
                    const SizedBox(height: 20),
                  ],

                  // Email
                  TextFormField(
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(
                      labelText: 'Correo electrónico',
                      prefixIcon: Icon(Icons.email_outlined, color: AppTheme.textSecondary),
                    ),
                    validator: (val) => val == null || !val.contains('@')
                        ? 'Ingresa un correo válido'
                        : null,
                  ),
                  const SizedBox(height: 16),

                  // Password
                  TextFormField(
                    controller: _passwordController,
                    obscureText: _obscurePassword,
                    decoration: InputDecoration(
                      labelText: 'Contraseña',
                      prefixIcon: const Icon(Icons.lock_outline_rounded, color: AppTheme.textSecondary),
                      suffixIcon: IconButton(
                        icon: Icon(
                          _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                          color: AppTheme.textMuted,
                        ),
                        onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                      ),
                    ),
                    validator: (val) =>
                        val == null || val.length < 4 ? 'Ingresa tu contraseña' : null,
                  ),
                  const SizedBox(height: 12),

                  // Opción de Huella Dactilar
                  if (auth.isBiometricAvailable) ...[
                    CheckboxListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text(
                        'Activar acceso rápido con Huella Dactilar',
                        style: TextStyle(fontSize: 12, color: AppTheme.textSecondary, fontWeight: FontWeight.w600),
                      ),
                      value: _enableBiometrics,
                      activeColor: AppTheme.secondary,
                      controlAffinity: ListTileControlAffinity.leading,
                      onChanged: (v) => setState(() => _enableBiometrics = v ?? true),
                    ),
                    const SizedBox(height: 12),
                  ],

                  // Botón Iniciar Sesión
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: ElevatedButton(
                      onPressed: auth.isLoading ? null : _submit,
                      child: auth.isLoading
                          ? const SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : const Text(
                              'Iniciar Sesión',
                              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
                            ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  const Text(
                    '© 2026 ProyecAhorro · Desarrollado por DG design',
                    style: TextStyle(fontSize: 11, color: AppTheme.textMuted),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
