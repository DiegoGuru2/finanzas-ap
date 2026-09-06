import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../../providers/finances_provider.dart';
import '../../../core/theme/app_theme.dart';

class SettingsView extends StatefulWidget {
  const SettingsView({super.key});

  @override
  State<SettingsView> createState() => _SettingsViewState();
}

class _SettingsViewState extends State<SettingsView> {
  final _formKey = GlobalKey<FormState>();
  final _currencyFormat = NumberFormat.currency(symbol: '\$', decimalDigits: 2);

  bool _isInitialized = false;
  bool _isSaving = false;

  // Form states
  late TextEditingController _nameController;
  late TextEditingController _amountController;
  late TextEditingController _sbuController;
  late TextEditingController _utilidadesController;
  late TextEditingController _programmedSavingsController;
  late TextEditingController _quincenaController;
  late TextEditingController _finDeMesController;

  String _paymentScheme = 'quincena_fin_mes'; // 'quincena_fin_mes' or 'monthly'
  bool _splitManual = false;

  bool _deductIess = true;
  double _iessPercentage = 9.45;

  bool _hasProgrammedSavings = false;

  // Beneficios Ecuador
  bool _hasFondosReserva = false;
  bool _fondosReservaMensualizado = true;
  bool _decimoTerceroMensualizado = true;
  bool _decimoCuartoMensualizado = true;
  String _region = 'costa'; // 'costa' or 'sierra'
  bool _hasUtilidades = true;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: 'Sueldo Principal');
    _amountController = TextEditingController(text: '1200.00');
    _sbuController = TextEditingController(text: '460.00');
    _utilidadesController = TextEditingController(text: '0.00');
    _programmedSavingsController = TextEditingController(text: '100.00');
    _quincenaController = TextEditingController(text: '0.00');
    _finDeMesController = TextEditingController(text: '0.00');

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadFromProvider();
    });
  }

  void _loadFromProvider() {
    final fin = context.read<FinancesProvider>();
    final principal = fin.incomes.firstWhere(
      (i) => i['isSalary'] == true,
      orElse: () => {},
    );

    if (principal.isNotEmpty) {
      _nameController.text = principal['name'] ?? 'Sueldo Principal';
      final amt = (principal['amount'] as num?)?.toDouble() ?? 1200.0;
      _amountController.text = amt.toStringAsFixed(2);
      _paymentScheme = principal['paymentScheme'] ?? 'quincena_fin_mes';
      _deductIess = principal['deductIess'] ?? true;
      _iessPercentage = (principal['iessPercentage'] as num?)?.toDouble() ?? 9.45;

      _hasProgrammedSavings = principal['hasProgrammedSavings'] == true;
      final progAmt = (principal['programmedSavingsAmount'] as num?)?.toDouble() ?? 100.0;
      _programmedSavingsController.text = progAmt.toStringAsFixed(2);

      _hasFondosReserva = principal['hasFondosReserva'] == true;
      _fondosReservaMensualizado = principal['fondosReservaMensualizado'] ?? true;
      _decimoTerceroMensualizado = principal['decimoTerceroMensualizado'] ?? true;
      _decimoCuartoMensualizado = principal['decimoCuartoMensualizado'] ?? true;
      _region = principal['region'] == 'sierra' ? 'sierra' : 'costa';

      final sbu = (principal['sbuAmount'] as num?)?.toDouble() ?? 460.0;
      _sbuController.text = sbu.toStringAsFixed(2);

      _hasUtilidades = principal['hasUtilidades'] ?? true;
      final utiAmt = (principal['utilidadesAmount'] as num?)?.toDouble() ?? 0.0;
      _utilidadesController.text = utiAmt.toStringAsFixed(2);

      final q = (principal['quincenaAmount'] as num?)?.toDouble() ?? 0.0;
      final f = (principal['finDeMesAmount'] as num?)?.toDouble() ?? 0.0;
      if (q > 0) {
        _splitManual = true;
        _quincenaController.text = q.toStringAsFixed(2);
        _finDeMesController.text = f.toStringAsFixed(2);
      }
    }

    _recalculateLive();
    setState(() {
      _isInitialized = true;
    });
  }

  // Cálculos en vivo
  double get _grossSalary => double.tryParse(_amountController.text) ?? 0.0;
  double get _iessAmount => _deductIess ? (_grossSalary * (_iessPercentage / 100)) : 0.0;
  double get _sbuAmount => double.tryParse(_sbuController.text) ?? 460.0;
  double get _utilidadesAmount => double.tryParse(_utilidadesController.text) ?? 0.0;
  double get _programmedSavingsAmt => _hasProgrammedSavings ? (double.tryParse(_programmedSavingsController.text) ?? 0.0) : 0.0;

  double get _fondosReservaMonthly => (_hasFondosReserva && _fondosReservaMensualizado) ? (_grossSalary / 12) : 0.0;
  double get _decimoTerceroMonthly => _decimoTerceroMensualizado ? (_grossSalary / 12) : 0.0;
  double get _decimoCuartoMonthly => _decimoCuartoMensualizado ? (_sbuAmount / 12) : 0.0;
  double get _utilidadesMonthly => (_hasUtilidades && _utilidadesAmount > 0) ? (_utilidadesAmount / 12) : 0.0;

  double get _totalBenefitsMonthly =>
      _fondosReservaMonthly + _decimoTerceroMonthly + _decimoCuartoMonthly + _utilidadesMonthly;

  double get _netSalary => (_grossSalary - _iessAmount) + _totalBenefitsMonthly;

  void _recalculateLive() {
    if (_paymentScheme != 'quincena_fin_mes') {
      _quincenaController.text = '0.00';
      _finDeMesController.text = (_netSalary - _programmedSavingsAmt).clamp(0, double.infinity).toStringAsFixed(2);
    } else if (!_splitManual) {
      final half = ((_grossSalary - _iessAmount) / 2);
      _quincenaController.text = half.toStringAsFixed(2);
      final fin = (half + _totalBenefitsMonthly - _programmedSavingsAmt).clamp(0, double.infinity);
      _finDeMesController.text = fin.toStringAsFixed(2);
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _amountController.dispose();
    _sbuController.dispose();
    _utilidadesController.dispose();
    _programmedSavingsController.dispose();
    _quincenaController.dispose();
    _finDeMesController.dispose();
    super.dispose();
  }

  Future<void> _saveSettings() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);
    try {
      final data = {
        'name': _nameController.text.trim(),
        'amount': _grossSalary,
        'frequency': 'monthly',
        'isSalary': true,
        'paymentScheme': _paymentScheme,
        'quincenaAmount': double.tryParse(_quincenaController.text) ?? 0.0,
        'finDeMesAmount': double.tryParse(_finDeMesController.text) ?? 0.0,
        'deductIess': _deductIess,
        'iessPercentage': _iessPercentage,
        'hasProgrammedSavings': _hasProgrammedSavings,
        'programmedSavingsAmount': _programmedSavingsAmt,
        'hasFondosReserva': _hasFondosReserva,
        'fondosReservaMensualizado': _fondosReservaMensualizado,
        'decimoTerceroMensualizado': _decimoTerceroMensualizado,
        'decimoCuartoMensualizado': _decimoCuartoMensualizado,
        'region': _region,
        'sbuAmount': _sbuAmount,
        'hasUtilidades': _hasUtilidades,
        'utilidadesAmount': _utilidadesAmount,
        'category': 'Sueldo',
      };

      await context.read<FinancesProvider>().saveSalarySettings(data);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: AppTheme.success,
            content: Text('✅ ¡Configuración guardada exitosamente!'),
          ),
        );
        Navigator.of(context).pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppTheme.danger,
            content: Text('Error al guardar: $e'),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_isInitialized) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator(color: AppTheme.primary)),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Configuración Financiera', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
        actions: [
          IconButton(
            tooltip: 'Guardar',
            icon: _isSaving
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.check_rounded, color: AppTheme.success),
            onPressed: _isSaving ? null : _saveSettings,
          ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
          children: [
            // ─── Tarjeta de Resumen en Vivo ───
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF1E1B4B), Color(0xFF0F172A)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppTheme.primaryLight.withValues(alpha: 0.3)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('SUELDO NETO LÍQUIDO CALCULADO',
                      style: TextStyle(color: AppTheme.textMuted, fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1.2)),
                  const SizedBox(height: 8),
                  Text(_currencyFormat.format(_netSalary),
                      style: const TextStyle(color: AppTheme.primaryLight, fontSize: 32, fontWeight: FontWeight.w900)),
                  const SizedBox(height: 6),
                  Text(
                    'Bruto: ${_currencyFormat.format(_grossSalary)}  ·  IESS ($_iessPercentage%): -${_currencyFormat.format(_iessAmount)}${_totalBenefitsMonthly > 0 ? '  ·  Beneficios: +${_currencyFormat.format(_totalBenefitsMonthly)}' : ''}',
                    style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12),
                  ),
                  if (_hasProgrammedSavings) ...[
                    const Divider(color: Colors.white12, height: 20),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Disponible a Fin de Mes (tras ahorro):',
                            style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                        Text(_currencyFormat.format(double.tryParse(_finDeMesController.text) ?? 0.0),
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 13)),
                      ],
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 24),

            // ─── Bloque 1: Sueldo Principal ───
            _buildSectionHeader(Icons.payments_rounded, 'Sueldo e Ingreso Base', AppTheme.primary),
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    TextFormField(
                      controller: _nameController,
                      decoration: const InputDecoration(labelText: 'Concepto / Empleo', prefixIcon: Icon(Icons.badge_outlined)),
                      validator: (v) => v == null || v.isEmpty ? 'Requerido' : null,
                    ),
                    const SizedBox(height: 14),
                    TextFormField(
                      controller: _amountController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(labelText: 'Sueldo Bruto Nominal (\$ USD)', prefixIcon: Icon(Icons.attach_money_rounded)),
                      validator: (v) => (double.tryParse(v ?? '') ?? 0) <= 0 ? 'Ingresa un sueldo válido' : null,
                      onChanged: (_) {
                        _recalculateLive();
                        setState(() {});
                      },
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // ─── Bloque 2: Aporte Personal al IESS ───
            _buildSectionHeader(Icons.security_rounded, 'Aporte IESS (Ecuador)', AppTheme.warning),
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text('Descontar Aporte Personal al IESS', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                      subtitle: const Text('Calculado sobre el salario nominal bruto', style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                      value: _deductIess,
                      activeColor: AppTheme.warning,
                      onChanged: (val) {
                        setState(() {
                          _deductIess = val;
                          _recalculateLive();
                        });
                      },
                    ),
                    if (_deductIess) ...[
                      const SizedBox(height: 10),
                      DropdownButtonFormField<double>(
                        value: _iessPercentage,
                        decoration: const InputDecoration(labelText: 'Régimen de Afiliación'),
                        items: const [
                          DropdownMenuItem(value: 9.45, child: Text('9.45% (Bajo dependencia / Privado)')),
                          DropdownMenuItem(value: 11.45, child: Text('11.45% (Sector Público)')),
                          DropdownMenuItem(value: 17.60, child: Text('17.60% (Afiliación Voluntaria)')),
                          DropdownMenuItem(value: 20.60, child: Text('20.60% (Sin relación)')),
                        ],
                        onChanged: (val) {
                          if (val != null) {
                            setState(() {
                              _iessPercentage = val;
                              _recalculateLive();
                            });
                          }
                        },
                      ),
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Descuento IESS Mensual:', style: TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
                          Text('-${_currencyFormat.format(_iessAmount)}',
                              style: const TextStyle(color: AppTheme.warning, fontWeight: FontWeight.w800, fontSize: 14)),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // ─── Bloque 3: Modalidad de Cobro ───
            _buildSectionHeader(Icons.calendar_month_rounded, 'Modalidad de Cobro', AppTheme.secondary),
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: ChoiceChip(
                            label: const Text('Quincena + Fin de Mes'),
                            selected: _paymentScheme == 'quincena_fin_mes',
                            onSelected: (sel) {
                              if (sel) {
                                setState(() {
                                  _paymentScheme = 'quincena_fin_mes';
                                  _splitManual = false;
                                  _recalculateLive();
                                });
                              }
                            },
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: ChoiceChip(
                            label: const Text('Un Solo Pago (Fin de Mes)'),
                            selected: _paymentScheme == 'monthly',
                            onSelected: (sel) {
                              if (sel) {
                                setState(() {
                                  _paymentScheme = 'monthly';
                                  _recalculateLive();
                                });
                              }
                            },
                          ),
                        ),
                      ],
                    ),
                    if (_paymentScheme == 'quincena_fin_mes') ...[
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: _quincenaController,
                              keyboardType: const TextInputType.numberWithOptions(decimal: true),
                              decoration: const InputDecoration(labelText: 'Anticipo Quincena (Día 15)', prefixText: '\$ '),
                              onChanged: (_) {
                                _splitManual = true;
                                setState(() {});
                              },
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextFormField(
                              controller: _finDeMesController,
                              keyboardType: const TextInputType.numberWithOptions(decimal: true),
                              decoration: const InputDecoration(labelText: 'Saldo Fin de Mes (Día 30)', prefixText: '\$ '),
                              onChanged: (_) {
                                _splitManual = true;
                                setState(() {});
                              },
                            ),
                          ),
                        ],
                      ),
                      if (_splitManual)
                        Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: TextButton.icon(
                            onPressed: () {
                              setState(() {
                                _splitManual = false;
                                _recalculateLive();
                              });
                            },
                            icon: const Icon(Icons.restart_alt_rounded, size: 16),
                            label: const Text('Restaurar cálculo 50/50 automático', style: TextStyle(fontSize: 12)),
                          ),
                        ),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // ─── Bloque 4: Ahorro Programado ───
            _buildSectionHeader(Icons.savings_rounded, 'Ahorro Programado / Débito Automático', AppTheme.success),
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text('Activar Ahorro Programado a Fin de Mes', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                      subtitle: const Text('Se aparta automáticamente de tu pago del día 30', style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                      value: _hasProgrammedSavings,
                      activeColor: AppTheme.success,
                      onChanged: (val) {
                        setState(() {
                          _hasProgrammedSavings = val;
                          _recalculateLive();
                        });
                      },
                    ),
                    if (_hasProgrammedSavings) ...[
                      const SizedBox(height: 10),
                      TextFormField(
                        controller: _programmedSavingsController,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        decoration: const InputDecoration(labelText: 'Monto a Reservar (\$ USD)', prefixIcon: Icon(Icons.attach_money_rounded)),
                        onChanged: (_) {
                          _recalculateLive();
                          setState(() {});
                        },
                      ),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // ─── Bloque 5: Beneficios de Ley Ecuador ───
            _buildSectionHeader(Icons.gavel_rounded, 'Beneficios de Ley (Ecuador)', AppTheme.secondary),
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Fondos de Reserva
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text('Fondos de Reserva (8.33%)', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                      subtitle: const Text('Aplica tras cumplir 1 año en la empresa', style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                      value: _hasFondosReserva,
                      activeColor: AppTheme.primary,
                      onChanged: (val) {
                        setState(() {
                          _hasFondosReserva = val;
                          _recalculateLive();
                        });
                      },
                    ),
                    if (_hasFondosReserva) ...[
                      Row(
                        children: [
                          ChoiceChip(
                            label: const Text('Mensualizado'),
                            selected: _fondosReservaMensualizado,
                            onSelected: (s) {
                              if (s) setState(() { _fondosReservaMensualizado = true; _recalculateLive(); });
                            },
                          ),
                          const SizedBox(width: 8),
                          ChoiceChip(
                            label: const Text('Acumulado en IESS'),
                            selected: !_fondosReservaMensualizado,
                            onSelected: (s) {
                              if (s) setState(() { _fondosReservaMensualizado = false; _recalculateLive(); });
                            },
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                    ],
                    const Divider(color: Colors.white10),

                    // Décimo Tercero
                    const Text('Décimo Tercer Sueldo (Navideño)', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                    const SizedBox(height: 4),
                    const Text('1/12 del sueldo anual', style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        ChoiceChip(
                          label: const Text('Mensualizado'),
                          selected: _decimoTerceroMensualizado,
                          onSelected: (s) {
                            if (s) setState(() { _decimoTerceroMensualizado = true; _recalculateLive(); });
                          },
                        ),
                        const SizedBox(width: 8),
                        ChoiceChip(
                          label: const Text('Pago en Diciembre'),
                          selected: !_decimoTerceroMensualizado,
                          onSelected: (s) {
                            if (s) setState(() { _decimoTerceroMensualizado = false; _recalculateLive(); });
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    const Divider(color: Colors.white10),

                    // Décimo Cuarto
                    const Text('Décimo Cuarto Sueldo (Escolar)', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                    const SizedBox(height: 4),
                    const Text('1 SBU vigente (Ecuador)', style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        ChoiceChip(
                          label: const Text('Mensualizado'),
                          selected: _decimoCuartoMensualizado,
                          onSelected: (s) {
                            if (s) setState(() { _decimoCuartoMensualizado = true; _recalculateLive(); });
                          },
                        ),
                        const SizedBox(width: 8),
                        ChoiceChip(
                          label: const Text('Pago Anual'),
                          selected: !_decimoCuartoMensualizado,
                          onSelected: (s) {
                            if (s) setState(() { _decimoCuartoMensualizado = false; _recalculateLive(); });
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            value: _region,
                            decoration: const InputDecoration(labelText: 'Región'),
                            items: const [
                              DropdownMenuItem(value: 'costa', child: Text('Costa (Marzo)')),
                              DropdownMenuItem(value: 'sierra', child: Text('Sierra (Agosto)')),
                            ],
                            onChanged: (val) {
                              if (val != null) setState(() => _region = val);
                            },
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: TextFormField(
                            controller: _sbuController,
                            keyboardType: const TextInputType.numberWithOptions(decimal: true),
                            decoration: const InputDecoration(labelText: 'SBU Vigente (\$)', prefixText: '\$ '),
                            onChanged: (_) {
                              _recalculateLive();
                              setState(() {});
                            },
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    const Divider(color: Colors.white10),

                    // Utilidades
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text('Empresa Reparte Utilidades (15%)', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                      subtitle: const Text('Estimado anual a prorratear', style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                      value: _hasUtilidades,
                      activeColor: AppTheme.secondary,
                      onChanged: (val) {
                        setState(() {
                          _hasUtilidades = val;
                          _recalculateLive();
                        });
                      },
                    ),
                    if (_hasUtilidades)
                      TextFormField(
                        controller: _utilidadesController,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        decoration: const InputDecoration(labelText: 'Monto Estimado Anual (\$ USD)', prefixIcon: Icon(Icons.attach_money_rounded)),
                        onChanged: (_) {
                          _recalculateLive();
                          setState(() {});
                        },
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 32),

            // ─── Botón Guardar Principal ───
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                backgroundColor: AppTheme.primary,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              onPressed: _isSaving ? null : _saveSettings,
              icon: _isSaving
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Icon(Icons.save_rounded, color: Colors.white),
              label: Text(_isSaving ? 'Guardando cambios...' : 'Guardar y Actualizar Todo',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Colors.white)),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(IconData icon, String title, Color color) {
    return Row(
      children: [
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, size: 18, color: color),
        ),
        const SizedBox(width: 10),
        Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Colors.white)),
      ],
    );
  }
}
