import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../../models/activity_model.dart';
import '../../../providers/activities_provider.dart';
import '../../../core/theme/app_theme.dart';

class AddActivityModal extends StatefulWidget {
  const AddActivityModal({super.key});

  @override
  State<AddActivityModal> createState() => _AddActivityModalState();
}

class _AddActivityModalState extends State<AddActivityModal> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descController = TextEditingController();

  ActivityCategory _selectedCategory = ActivityCategory.medicamento;
  DateTime _selectedDate = DateTime.now().add(const Duration(minutes: 5));
  TimeOfDay _selectedTime = TimeOfDay.fromDateTime(DateTime.now().add(const Duration(minutes: 5)));

  String _recurrenceType = 'interval_hours';
  int _intervalHours = 8; // Default 8 hours for meds
  final bool _isCritical = true;
  bool _requiresLock = true;
  bool _isSubmitting = false;

  @override
  void dispose() {
    _titleController.dispose();
    _descController.dispose();
    super.dispose();
  }

  void _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final scheduled = DateTime(
      _selectedDate.year,
      _selectedDate.month,
      _selectedDate.day,
      _selectedTime.hour,
      _selectedTime.minute,
    );

    setState(() => _isSubmitting = true);

    try {
      final provider = context.read<ActivitiesProvider>();
      await provider.addActivity(
        title: _titleController.text.trim(),
        description: _descController.text.trim(),
        category: _selectedCategory,
        scheduledAt: scheduled,
        recurrenceType: _recurrenceType,
        intervalHours: _recurrenceType == 'interval_hours' ? _intervalHours : null,
        isCritical: _isCritical,
        requiresLock: _requiresLock,
      );

      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppTheme.success,
            content: Text(
              _selectedCategory == ActivityCategory.medicamento
                  ? '💊 Alarma de medicamento programada'
                  : '⏰ Recordatorio programado con éxito',
            ),
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
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Nuevo Recordatorio',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close_rounded, color: AppTheme.textSecondary),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Selector de categorías
              const Text(
                'Categoría',
                style: TextStyle(color: AppTheme.textSecondary, fontSize: 13, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 10),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: ActivityCategory.values.map((cat) {
                    final isSelected = _selectedCategory == cat;
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        selected: isSelected,
                        onSelected: (val) {
                          setState(() {
                            _selectedCategory = cat;
                            if (cat == ActivityCategory.medicamento) {
                              _recurrenceType = 'interval_hours';
                            }
                          });
                        },
                        avatar: Icon(cat.icon, size: 16, color: isSelected ? Colors.white : cat.color),
                        label: Text(cat.displayName),
                        selectedColor: cat.color,
                        backgroundColor: AppTheme.background,
                        labelStyle: TextStyle(
                          color: isSelected ? Colors.white : AppTheme.textSecondary,
                          fontWeight: FontWeight.w700,
                          fontSize: 12,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(20),
                          side: BorderSide(
                            color: isSelected ? cat.color : AppTheme.border,
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
              const SizedBox(height: 18),

              // Título
              TextFormField(
                controller: _titleController,
                decoration: InputDecoration(
                  labelText: _selectedCategory == ActivityCategory.medicamento
                      ? 'Nombre del Medicamento (ej. Paracetamol 500mg)'
                      : 'Título de la actividad',
                  prefixIcon: Icon(_selectedCategory.icon, color: _selectedCategory.color),
                ),
                validator: (val) =>
                    val == null || val.trim().isEmpty ? 'Ingresa un título' : null,
              ),
              const SizedBox(height: 14),

              // Descripción
              TextFormField(
                controller: _descController,
                maxLines: 2,
                decoration: const InputDecoration(
                  labelText: 'Instrucciones o dosis (ej. 1 cápsula con agua)',
                  prefixIcon: Icon(Icons.description_outlined, color: AppTheme.textMuted),
                ),
              ),
              const SizedBox(height: 16),

              // Fecha y Hora
              Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: () async {
                        final picked = await showDatePicker(
                          context: context,
                          initialDate: _selectedDate,
                          firstDate: DateTime.now(),
                          lastDate: DateTime.now().add(const Duration(days: 365)),
                        );
                        if (picked != null) setState(() => _selectedDate = picked);
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        decoration: BoxDecoration(
                          color: AppTheme.background,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppTheme.border),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.calendar_today_rounded, size: 16, color: AppTheme.primaryLight),
                            const SizedBox(width: 8),
                            Text(
                              DateFormat('dd/MM/yyyy').format(_selectedDate),
                              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: InkWell(
                      onTap: () async {
                        final picked = await showTimePicker(
                          context: context,
                          initialTime: _selectedTime,
                        );
                        if (picked != null) setState(() => _selectedTime = picked);
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        decoration: BoxDecoration(
                          color: AppTheme.background,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppTheme.border),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.access_time_rounded, size: 16, color: AppTheme.secondary),
                            const SizedBox(width: 8),
                            Text(
                              _selectedTime.format(context),
                              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),

              // Frecuencia / Recurrencia
              const Text(
                'Repetición',
                style: TextStyle(color: AppTheme.textSecondary, fontSize: 13, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                isExpanded: true,
                initialValue: _recurrenceType,
                dropdownColor: AppTheme.surfaceElevated,
                decoration: const InputDecoration(
                  contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                ),
                items: const [
                  DropdownMenuItem(value: 'none', child: Text('Una sola vez', overflow: TextOverflow.ellipsis)),
                  DropdownMenuItem(value: 'interval_hours', child: Text('Cada X horas (Medicamentos)', overflow: TextOverflow.ellipsis)),
                  DropdownMenuItem(value: 'daily', child: Text('Todos los días', overflow: TextOverflow.ellipsis)),
                  DropdownMenuItem(value: 'weekly', child: Text('Semanal', overflow: TextOverflow.ellipsis)),
                ],
                onChanged: (val) => setState(() => _recurrenceType = val ?? 'none'),
              ),

              // Selector de horas si es intervalo
              if (_recurrenceType == 'interval_hours') ...[
                const SizedBox(height: 12),
                Row(
                  children: [4, 6, 8, 12, 24].map((hours) {
                    final isSel = _intervalHours == hours;
                    return Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 3),
                        child: InkWell(
                          onTap: () => setState(() => _intervalHours = hours),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            decoration: BoxDecoration(
                              color: isSel ? AppTheme.primary : AppTheme.background,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: isSel ? AppTheme.primary : AppTheme.border,
                              ),
                            ),
                            child: Center(
                              child: Text(
                                '$hours hrs',
                                style: TextStyle(
                                  color: isSel ? Colors.white : AppTheme.textSecondary,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ],
              const SizedBox(height: 18),

              // Switches de opciones
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                activeThumbColor: AppTheme.primary,
                title: const Text('Bloqueo de pantalla completa', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                subtitle: const Text('Enciende el celular y muestra la actividad en grande', style: TextStyle(fontSize: 12, color: AppTheme.textMuted)),
                value: _requiresLock,
                onChanged: (val) => setState(() => _requiresLock = val),
              ),

              const SizedBox(height: 20),

              // Botón Guardar
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: _isSubmitting ? null : _submit,
                  child: _isSubmitting
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Text('Programar Recordatorio'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
