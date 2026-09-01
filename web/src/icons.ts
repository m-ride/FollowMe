import {
  createIcons,
  House, ReceiptText, Plus, CreditCard, PiggyBank, Bell,
  ShoppingCart, Utensils, CarFront, Tv, HeartPulse, Shirt, ShieldCheck, Plane, Wallet,
  ChevronLeft, Check, ChevronDown, Landmark, Banknote, Tag, Trash2, Pencil, Lock,
  Download, Upload, Table, TriangleAlert, TrendingUp,
} from 'lucide';

// createIcons hace toPascalCase(data-lucide) y busca esa clave: las claves aquí
// deben ser el PascalCase del icono ("receipt-text" -> ReceiptText), no kebab-case.
const ICONS = {
  House, ReceiptText, Plus, CreditCard, PiggyBank, Bell,
  ShoppingCart, Utensils, CarFront, Tv, HeartPulse, Shirt, ShieldCheck, Plane, Wallet,
  ChevronLeft, Check, ChevronDown, Landmark, Banknote, Tag, Trash2, Pencil, Lock,
  Download, Upload, Table, TriangleAlert, TrendingUp,
};

// Cualquier pantalla que se re-renderiza a sí misma (fuera del router, tras guardar
// algo) debe llamar esto después — el router solo dispara el refresh automático en
// una navegación real (hashchange), no en un re-render disparado a mano.
export const refreshIcons = () => createIcons({ icons: ICONS, attrs: { 'stroke-width': 1.75 } });

// El rubro no trae icono propio (no existe ese campo en el backend); se infiere
// por palabras clave del nombre y se cae a un icono genérico si no calza ninguna.
const PALABRAS: [RegExp, string][] = [
  [/super|despensa|mercado/i, 'shopping-cart'],
  [/comida|restaurante|antojo/i, 'utensils'],
  [/transporte|gasolina|uber|coche|auto/i, 'car-front'],
  [/casa|renta|servicios|luz|agua/i, 'house'],
  [/entretenimiento|cine|streaming|diversión/i, 'tv'],
  [/salud|doctor|medicina/i, 'heart-pulse'],
  [/ropa|vestimenta/i, 'shirt'],
  [/emergencia/i, 'shield-check'],
  [/viaje|vacaciones/i, 'plane'],
];

export const iconoRubro = (nombre: string): string =>
  PALABRAS.find(([re]) => re.test(nombre))?.[1] ?? 'wallet';

export const iconoMetodo = (tipo: string): string =>
  tipo === 'credito' ? 'credit-card' : tipo === 'debito' ? 'landmark' : 'banknote';
