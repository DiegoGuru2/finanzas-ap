import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../providers/finances_provider.dart';
import '../../../core/theme/app_theme.dart';

class AddIncomeModal extends StatefulWidget {
  const AddIncomeModal({super.key});

  @override
  State<AddIncomeModal> createState() => _AddIncomeModalState();
}

class _AddIncomeModalState extends State<AddIncomeModal> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController(text: 'Sueldo');
  final _amountController = TextEditingController();

  final String _frequency = 'monthly';
  final bool _isSalary = true;
  String _paymentScheme = 'quincena_fin_mes';
  bool _deductIess = true;
  bool _isSubmitting = false;

  @override
  void dispose() {
    _nameController.dispose();
    _amountController.dispose();
    super.dispose();
  }

  void _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);

    try {
      final amount = double.tryParse(_amountController.text) ?? 0.0;

      final data = {
        'name': _nameController.text.trim(),
        'amount': amount,
        'frequency': _frequency,
        'isSalary': _isSalary,
        'paymentScheme': _paymentScheme,
        'deductIess': _deductIess,
        'iessPercentage': 9.45,
        'hasFondosReserva': false,
        'fondosReservaMensualizado': true,
        'decimoTerceroMensualizado': true,
        'decimoCuartoMensualizado': true,
        'region': 'costa',
        'sbuAmount': 460.0,
        'hasUtilidades': false,
        'utilidadesAmount': 0.0,
      };

      await context.read<FinancesProvider>().addIncome(data);

      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: AppTheme.success,
            content: Text('💵 Ingreso registrado con éxito'),
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
                    'Registrar Ingreso',
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
                  labelText: 'Concepto (ej. Sueldo Empresa, Negocio Propio)',
                  prefixIcon: Icon(Icons.work_outline_rounded, color: AppTheme.secondary),
                ),
                validator: (val) => val == null || val.trim().isEmpty ? 'Ingresa el concepto' : null,
              ),
              const SizedBox(height: 12),

              TextFormField(
                controller: _amountController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(
                  labelText: 'Monto Bruto (\$) *',
                  prefixText: '\$ ',
                ),
                validator: (val) => val == null || double.tryParse(val) == null ? 'Monto inválido' : null,
              ),
              const SizedBox(height: 14),

              DropdownButtonFormField<String>(
                isExpanded: true,
                initialValue: _paymentScheme,
                dropdownColor: AppTheme.surfaceElevated,
                decoration: const InputDecoration(labelText: 'Modalidad de Cobro'),
                items: const [
                  DropdownMenuItem(value: 'quincena_fin_mes', child: Text('Quincena + Fin de Mes (50/50)', overflow: TextOverflow.ellipsis)),
                  DropdownMenuItem(value: 'monthly', child: Text('Fin de Mes Completo (100%)', overflow: TextOverflow.ellipsis)),
                ],
                onChanged: (val) => setState(() => _paymentScheme = val ?? 'quincena_fin_mes'),
              ),
              const SizedBox(height: 14),

              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                activeThumbColor: AppTheme.primary,
                title: const Text('Descontar Aporte IESS (9.45%)', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                subtitle: const Text('Aplica para sueldos bajo relación de dependencia en Ecuador', style: TextStyle(fontSize: 12, color: AppTheme.textMuted)),
                value: _deductIess,
                onChanged: (val) => setState(() => _deductIess = val),
              ),
              const SizedBox(height: 20),

              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: _isSubmitting ? null : _submit,
                  child: _isSubmitting
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Guardar Ingreso'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
