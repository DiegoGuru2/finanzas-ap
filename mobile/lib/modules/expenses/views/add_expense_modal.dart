import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../providers/finances_provider.dart';
import '../../../core/theme/app_theme.dart';

class AddExpenseModal extends StatefulWidget {
  const AddExpenseModal({super.key});

  @override
  State<AddExpenseModal> createState() => _AddExpenseModalState();
}

class _AddExpenseModalState extends State<AddExpenseModal> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _amountController = TextEditingController();

  String _category = 'food';
  String _frequency = 'monthly';
  bool _isEssential = true;
  String _paymentTiming = 'ambas';
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
        'category': _category,
        'frequency': _frequency,
        'isEssential': _isEssential,
        'paymentTiming': _paymentTiming,
      };

      await context.read<FinancesProvider>().addExpense(data);

      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: AppTheme.success,
            content: Text('💸 Gasto registrado con éxito'),
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
                    'Registrar Gasto Rápido',
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
                  labelText: 'Concepto (ej. Almuerzo, Gasolina, Netflix)',
                  prefixIcon: Icon(Icons.receipt_rounded, color: AppTheme.danger),
                ),
                validator: (val) => val == null || val.trim().isEmpty ? 'Ingresa el concepto' : null,
              ),
              const SizedBox(height: 12),

              TextFormField(
                controller: _amountController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(
                  labelText: 'Monto del Gasto (\$) *',
                  prefixText: '\$ ',
                ),
                validator: (val) => val == null || double.tryParse(val) == null ? 'Monto inválido' : null,
              ),
              const SizedBox(height: 16),

              DropdownButtonFormField<String>(
                isExpanded: true,
                initialValue: _category,
                dropdownColor: AppTheme.surfaceElevated,
                decoration: const InputDecoration(labelText: 'Categoría'),
                items: const [
                  DropdownMenuItem(value: 'food', child: Text('Alimentación / Supermercado', overflow: TextOverflow.ellipsis)),
                  DropdownMenuItem(value: 'housing', child: Text('Vivienda / Arriendo', overflow: TextOverflow.ellipsis)),
                  DropdownMenuItem(value: 'transport', child: Text('Transporte / Combustible', overflow: TextOverflow.ellipsis)),
                  DropdownMenuItem(value: 'utilities', child: Text('Servicios Básicos (Luz, Agua, Net)', overflow: TextOverflow.ellipsis)),
                  DropdownMenuItem(value: 'health', child: Text('Salud y Farmacia', overflow: TextOverflow.ellipsis)),
                  DropdownMenuItem(value: 'entertainment', child: Text('Ocio y Salidas', overflow: TextOverflow.ellipsis)),
                  DropdownMenuItem(value: 'other', child: Text('Otro / Varios', overflow: TextOverflow.ellipsis)),
                ],
                onChanged: (val) => setState(() => _category = val ?? 'food'),
              ),
              const SizedBox(height: 14),

              Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      isExpanded: true,
                      initialValue: _frequency,
                      dropdownColor: AppTheme.surfaceElevated,
                      decoration: const InputDecoration(labelText: 'Frecuencia'),
                      items: const [
                        DropdownMenuItem(value: 'monthly', child: Text('Mensual', overflow: TextOverflow.ellipsis)),
                        DropdownMenuItem(value: 'weekly', child: Text('Semanal', overflow: TextOverflow.ellipsis)),
                        DropdownMenuItem(value: 'once', child: Text('Único / Ocasional', overflow: TextOverflow.ellipsis)),
                      ],
                      onChanged: (val) => setState(() => _frequency = val ?? 'monthly'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      isExpanded: true,
                      initialValue: _paymentTiming,
                      dropdownColor: AppTheme.surfaceElevated,
                      decoration: const InputDecoration(labelText: 'Momento de Pago'),
                      items: const [
                        DropdownMenuItem(value: 'ambas', child: Text('Ambas', overflow: TextOverflow.ellipsis)),
                        DropdownMenuItem(value: 'quincena', child: Text('Quincena', overflow: TextOverflow.ellipsis)),
                        DropdownMenuItem(value: 'fin_de_mes', child: Text('Fin de Mes', overflow: TextOverflow.ellipsis)),
                      ],
                      onChanged: (val) => setState(() => _paymentTiming = val ?? 'ambas'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                activeThumbColor: AppTheme.success,
                title: const Text('Gasto Esencial', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                subtitle: const Text('Comida, arriendo, servicios indispensables', style: TextStyle(fontSize: 12, color: AppTheme.textMuted)),
                value: _isEssential,
                onChanged: (val) => setState(() => _isEssential = val),
              ),
              const SizedBox(height: 20),

              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: _isSubmitting ? null : _submit,
                  child: _isSubmitting
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Registrar Gasto'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
