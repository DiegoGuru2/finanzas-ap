import 'dotenv/config';
import { db } from './index';
import { user, incomes, debts, expenses } from './schema';
import { eq } from 'drizzle-orm';
import { generateId } from '../utils';

async function seedEcuadorData() {
  console.log('🇪🇨 Seeding sample Ecuadorian financial data for Diego Gurumendi...');

  const [targetUser] = await db.select().from(user).where(eq(user.email, 'diego@finanzas.app'));
  if (!targetUser) {
    console.error('User diego@finanzas.app not found!');
    return;
  }

  // 1. Clean existing financial items for fresh start
  await db.delete(incomes).where(eq(incomes.userId, targetUser.id));
  await db.delete(debts).where(eq(debts.userId, targetUser.id));
  await db.delete(expenses).where(eq(expenses.userId, targetUser.id));

  // 2. Insert Ecuadorian Salary
  // Sueldo Nominal $1,200 -> Descuento IESS 9.45% (-$113.40) -> Neto $1,086.60
  // Quincena (15): $500.00, Fin de mes (30): $586.60
  await db.insert(incomes).values({
    id: generateId(),
    userId: targetUser.id,
    name: 'Sueldo Principal (Empresa)',
    amount: '1200.00',
    frequency: 'monthly',
    isSalary: true,
    paymentScheme: 'quincena_fin_mes',
    quincenaAmount: '500.00',
    finDeMesAmount: '586.60',
    deductIess: true,
    iessPercentage: '9.45',
    category: 'Sueldo',
  });
  console.log('✅ Sueldo ecuatoriano registrado con descuento IESS y quincena');

  // 3. Insert Debts (Tarjetas de crédito Ecuador + BIESS)
  const sampleDebts = [
    {
      id: generateId(),
      userId: targetUser.id,
      name: 'Tarjeta Visa Banco Pichincha',
      creditor: 'Banco Pichincha',
      currentBalance: '1850.00',
      originalBalance: '2500.00',
      apr: '24.89',
      minimumPayment: '95.00',
      dueDay: 15,
      type: 'credit_card',
      paymentTiming: 'quincena',
    },
    {
      id: generateId(),
      userId: targetUser.id,
      name: 'Préstamo Quirografario BIESS',
      creditor: 'BIESS',
      currentBalance: '3200.00',
      originalBalance: '4000.00',
      apr: '11.50',
      minimumPayment: '115.00',
      dueDay: 30,
      type: 'biess_quirografario',
      paymentTiming: 'fin_de_mes',
    },
    {
      id: generateId(),
      userId: targetUser.id,
      name: 'Tarjeta Mastercard Banco Guayaquil',
      creditor: 'Banco Guayaquil',
      currentBalance: '820.00',
      originalBalance: '1200.00',
      apr: '25.40',
      minimumPayment: '55.00',
      dueDay: 20,
      type: 'credit_card',
      paymentTiming: 'fin_de_mes',
    },
  ];

  for (const d of sampleDebts) {
    await db.insert(debts).values(d);
  }
  console.log('✅ 3 deudas ecuatorianas registradas (Pichincha, BIESS, Guayaquil)');

  // 4. Insert Recurring Expenses
  const sampleExpenses = [
    {
      id: generateId(),
      userId: targetUser.id,
      name: 'Arriendo de Departamento',
      amount: '300.00',
      category: 'housing',
      isEssential: true,
      frequency: 'monthly',
    },
    {
      id: generateId(),
      userId: targetUser.id,
      name: 'Supermercado y Alimentación',
      amount: '220.00',
      category: 'food',
      isEssential: true,
      frequency: 'monthly',
    },
    {
      id: generateId(),
      userId: targetUser.id,
      name: 'Servicios Básicos (Luz, Agua, Internet CNT/Claro)',
      amount: '65.00',
      category: 'utilities',
      isEssential: true,
      frequency: 'monthly',
    },
    {
      id: generateId(),
      userId: targetUser.id,
      name: 'Transporte y Movilidad',
      amount: '45.00',
      category: 'transport',
      isEssential: true,
      frequency: 'monthly',
    },
  ];

  for (const exp of sampleExpenses) {
    await db.insert(expenses).values(exp);
  }
  console.log('✅ Gastos mensuales recurrentes registrados');

  console.log('🎉 Ecuadorian seed completed successfully!');
}

seedEcuadorData().catch(console.error);
