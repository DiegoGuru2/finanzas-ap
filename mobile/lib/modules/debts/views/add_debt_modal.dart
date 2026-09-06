import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../providers/finances_provider.dart';
import '../../../core/theme/app_theme.dart';

class AddDebtModal extends StatefulWidget {
  const AddDebtModal({super.key});

  @override
  State<AddDebtModal> createState() => _AddDebtModalState();
}

class _AddDebtModalState extends State<AddDebtModal> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _creditorController = TextEditingController();
  final _currentBalanceController = TextEditingController();
  final _minPaymentController = TextEditingController();
  final _aprController = TextEditingController(text: '16.5');
  final _dueDayController = TextEditingController(text: '15');

  String _selectedType = 'credit_card';
  bool _isSubmitting = false;

  @override
  void dispose() {
    _nameController.dispose();
    _creditorController.dispose();
    _currentBalanceController.dispose();
    _minPaymentController.dispose();
    _aprController.dispose();
    _dueDayController.dispose();
    super.dispose();
  }

  void _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);

    try {
      final curBal = double.tryParse(_currentBalanceController.text) ?? 0.0;
      final minPay = double.tryParse(_minPaymentController.text) ?? 0.0;
      final apr = double.tryParse(_aprController.text) ?? 0.0;
      final dueDay = int.tryParse(_dueDayController.text) ?? 15;

      final data = {
        'name': _nameController.text.trim(),
        'creditor': _creditorController.text.trim(),
        'currentBalance': curBal,
        'originalBalance': curBal,
        'minimumPayment': minPay,
        'apr': apr,
        'dueDay': dueDay,
        'type': _selectedType,
        'currency': 'USD',
        'status': 'active',
        'paymentTiming': 'fin_de_mes',
      };

      await context.read<FinancesProvider>().addDebt(data);

      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: AppTheme.success,
            content: Text('💳 Deuda registrada con éxito'),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppTheme.danger,
            content: Text(e.toString().replaceAll('Exception: ', '')),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      padding: EdgeInsets.only(
        top: 24,
        left: 20,
        right: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Registrar Nueva Deuda',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Colors.white),
                  ),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close_rounded, color: AppTheme.textSecondary),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(
                  labelText: 'Nombre o Concepto (ej. Tarjeta Oro)',
                  prefixIcon: Icon(Icons.credit_card_rounded, color: AppTheme.secondary),
                ),
                validator: (val) => val == null || val.trim().isEmpty ? 'Ingresa el nombre' : null,
              ),
              const SizedBox(height: 12),

              TextFormField(
                controller: _creditorController,
                decoration: const InputDecoration(
                  labelText: 'Acreedor o Banco (ej. Banco Pichincha)',
                  prefixIcon: Icon(Icons.account_balance_rounded, color: AppTheme.primaryLight),
                ),
              ),
              const SizedBox(height: 12),

              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _currentBalanceController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(
                        labelText: 'Saldo Total (\$) *',
                        prefixText: '\$ ',
                      ),
                      validator: (val) => val == null || double.tryParse(val) == null ? 'Monto inválido' : null,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextFormField(
                      controller: _minPaymentController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(
                        labelText: 'Cuota Mínima (\$) *',
                        prefixText: '\$ ',
                      ),
                      validator: (val) => val == null || double.tryParse(val) == null ? 'Cuota inválida' : null,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _aprController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(
                        labelText: 'Tasa APR (%)',
                        suffixText: '%',
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextFormField(
                      controller: _dueDayController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Día de Corte / Pago',
                        hintText: '15',
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              DropdownButtonFormField<String>(
                initialValue: _selectedType,
                dropdownColor: AppTheme.surfaceElevated,
                decoration: const InputDecoration(labelText: 'Tipo de Deuda'),
                items: const [
                  DropdownMenuItem(value: 'credit_card', child: Text('Tarjeta de Crédito')),
                  DropdownMenuItem(value: 'personal_loan', child: Text('Préstamo Personal')),
                  DropdownMenuItem(value: 'mortgage', child: Text('Hipotecario')),
                  DropdownMenuItem(value: 'car_loan', child: Text('Vehicular')),
                  DropdownMenuItem(value: 'informal', child: Text('Informal / Familiar')),
                ],
                onChanged: (val) => setState(() => _selectedType = val ?? 'credit_card'),
              ),
              const SizedBox(height: 24),

              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: _isSubmitting ? null : _submit,
                  child: _isSubmitting
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Guardar Deuda'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
