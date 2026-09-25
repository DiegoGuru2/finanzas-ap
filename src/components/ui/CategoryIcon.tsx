import React from 'react';
import {
  CreditCard,
  Landmark,
  Home,
  Building,
  Building2,
  Car,
  GraduationCap,
  FileText,
  Utensils,
  ShoppingCart,
  Zap,
  Lightbulb,
  HeartPulse,
  BookOpen,
  Clapperboard,
  Shield,
  ShieldCheck,
  ShieldAlert,
  PiggyBank,
  Wallet,
  Package,
  Plane,
  Target,
  Sun,
  Palmtree,
  Key,
  Lock,
  Mail,
  Users,
  Tv,
  Coins,
  DollarSign,
  TrendingUp,
  Receipt,
  AlertTriangle,
  Trophy,
  Flame,
  Sparkles,
  BarChart3,
  CircleDollarSign,
  Tag,
  HelpCircle,
  type LucideProps,
} from 'lucide-react';

interface CategoryIconProps extends LucideProps {
  category?: string | null;
  className?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ category, className = 'h-4 w-4', ...props }) => {
  const normalized = (category || '').toLowerCase().trim();

  // 1. Deudas & Préstamos
  if (normalized.includes('credit_card') || normalized.includes('tarjeta') || normalized.includes('💳')) {
    return <CreditCard className={className} {...props} />;
  }
  if (
    normalized.includes('biess_quirografario') ||
    normalized.includes('personal_loan') ||
    normalized.includes('préstamo') ||
    normalized.includes('prestamo') ||
    normalized.includes('bancario') ||
    normalized.includes('banking') ||
    normalized.includes('banco') ||
    normalized.includes('🏛️') ||
    normalized.includes('🏦')
  ) {
    return <Landmark className={className} {...props} />;
  }
  if (
    normalized.includes('biess_hipotecario') ||
    normalized.includes('hipoteca') ||
    normalized.includes('mortgage') ||
    normalized.includes('housing') ||
    normalized.includes('vivienda') ||
    normalized.includes('arriendo') ||
    normalized.includes('🏡') ||
    normalized.includes('🏘️') ||
    normalized.includes('🏠')
  ) {
    return <Home className={className} {...props} />;
  }
  if (
    normalized.includes('auto_loan') ||
    normalized.includes('automotriz') ||
    normalized.includes('transport') ||
    normalized.includes('vehiculo') ||
    normalized.includes('vehículo') ||
    normalized.includes('gasolina') ||
    normalized.includes('car') ||
    normalized.includes('🚙') ||
    normalized.includes('🚗')
  ) {
    return <Car className={className} {...props} />;
  }
  if (
    normalized.includes('student_loan') ||
    normalized.includes('educativo') ||
    normalized.includes('education') ||
    normalized.includes('educación') ||
    normalized.includes('educacion') ||
    normalized.includes('estudios') ||
    normalized.includes('🎓') ||
    normalized.includes('📚')
  ) {
    return <GraduationCap className={className} {...props} />;
  }

  // 2. Gastos & Presupuestos
  if (
    normalized.includes('food') ||
    normalized.includes('alimentación') ||
    normalized.includes('alimentacion') ||
    normalized.includes('supermercado') ||
    normalized.includes('comida') ||
    normalized.includes('🛒')
  ) {
    return <ShoppingCart className={className} {...props} />;
  }
  if (
    normalized.includes('utilities') ||
    normalized.includes('servicios') ||
    normalized.includes('luz') ||
    normalized.includes('agua') ||
    normalized.includes('internet') ||
    normalized.includes('💡')
  ) {
    return <Zap className={className} {...props} />;
  }
  if (
    normalized.includes('health') ||
    normalized.includes('salud') ||
    normalized.includes('medicina') ||
    normalized.includes('farmacia') ||
    normalized.includes('médico') ||
    normalized.includes('medico') ||
    normalized.includes('🏥')
  ) {
    return <HeartPulse className={className} {...props} />;
  }
  if (
    normalized.includes('entertainment') ||
    normalized.includes('entretenimiento') ||
    normalized.includes('salidas') ||
    normalized.includes('ocio') ||
    normalized.includes('cine') ||
    normalized.includes('🎬')
  ) {
    return <Clapperboard className={className} {...props} />;
  }
  if (
    normalized.includes('insurance') ||
    normalized.includes('seguros') ||
    normalized.includes('seguro') ||
    normalized.includes('🛡️')
  ) {
    return <Shield className={className} {...props} />;
  }
  if (
    normalized.includes('emergency') ||
    normalized.includes('emergencia')
  ) {
    return <ShieldAlert className={className} {...props} />;
  }
  if (
    normalized.includes('savings') ||
    normalized.includes('ahorro') ||
    normalized.includes('ahorros') ||
    normalized.includes('💰')
  ) {
    return <PiggyBank className={className} {...props} />;
  }
  if (
    normalized.includes('vacation') ||
    normalized.includes('vacaciones') ||
    normalized.includes('viaje') ||
    normalized.includes('viajes') ||
    normalized.includes('✈️')
  ) {
    return <Plane className={className} {...props} />;
  }
  if (
    normalized.includes('retirement') ||
    normalized.includes('jubilación') ||
    normalized.includes('jubilacion') ||
    normalized.includes('🏖️')
  ) {
    return <Sun className={className} {...props} />;
  }

  // 3. Bóveda / Vault
  if (normalized.includes('cards')) {
    return <CreditCard className={className} {...props} />;
  }
  if (normalized.includes('email') || normalized.includes('correo')) {
    return <Mail className={className} {...props} />;
  }
  if (normalized.includes('social') || normalized.includes('redes')) {
    return <Users className={className} {...props} />;
  }
  if (normalized.includes('streaming') || normalized.includes('tv')) {
    return <Tv className={className} {...props} />;
  }
  if (normalized.includes('notes') || normalized.includes('notas')) {
    return <FileText className={className} {...props} />;
  }
  if (normalized.includes('key') || normalized.includes('vault') || normalized.includes('🔐')) {
    return <Key className={className} {...props} />;
  }

  // 4. Badges / Logros
  if (normalized.includes('trophy') || normalized.includes('🏆')) {
    return <Trophy className={className} {...props} />;
  }
  if (normalized.includes('streak') || normalized.includes('racha') || normalized.includes('🔥')) {
    return <Flame className={className} {...props} />;
  }
  if (normalized.includes('sparkles') || normalized.includes('🎉') || normalized.includes('debt_free')) {
    return <Sparkles className={className} {...props} />;
  }
  if (normalized.includes('chart') || normalized.includes('budget_master') || normalized.includes('📊')) {
    return <BarChart3 className={className} {...props} />;
  }

  // 5. Otros / Default
  if (normalized.includes('target') || normalized.includes('🎯')) {
    return <Target className={className} {...props} />;
  }
  if (normalized.includes('other') || normalized.includes('otro') || normalized.includes('📦')) {
    return <Package className={className} {...props} />;
  }
  if (normalized.includes('file') || normalized.includes('📄')) {
    return <FileText className={className} {...props} />;
  }

  return <CircleDollarSign className={className} {...props} />;
};

export default CategoryIcon;
