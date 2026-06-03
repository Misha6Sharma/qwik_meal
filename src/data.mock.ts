import { Brand, MealPlan, MenuItem, Campaign } from './types';
import dominosLogo from './assets/logos/dominos.svg';
import pizzahutLogo from './assets/logos/pizzahut.svg';
import haldiramsLogo from './assets/logos/haldirams.svg';
import subwayLogo from './assets/logos/subway.svg';
import mcdonaldsLogo from './assets/logos/mcdonalds.svg';

import img1565299624946 from './assets/images/img_1565299624946.jpg';
import img1509722747041 from './assets/images/img_1509722747041.jpg';
import img1513104890138 from './assets/images/img_1513104890138.jpg';
import img1543339308 from './assets/images/img_1543339308.jpg';
import img1512621776951 from './assets/images/img_1512621776951.jpg';
import img1533089860892 from './assets/images/img_1533089860892.jpg';

export const mockBrands: Brand[] = [
  {
    id: 'b1',
    name: 'Domino\'s',
    logo: dominosLogo,
    description: 'Fresh, hot pizzas delivered fast.',
    offer: 'Corporate combo specials starting ₹150',
  },
  {
    id: 'b2',
    name: 'Pizza Hut',
    logo: pizzahutLogo,
    description: 'Iconic pizzas, pasta and more.',
    offer: 'Free beverage on orders above ₹300',
  },
  {
    id: 'b3',
    name: 'Haldiram\'s',
    logo: haldiramsLogo,
    description: 'Authentic Indian snacks & meals.',
    offer: 'Flat 20% off for verified corporates',
  },
  {
    id: 'b4',
    name: 'Subway',
    logo: subwayLogo,
    description: 'Fresh subs and salads.',
    offer: 'Buy 1 Get 1 on select meals',
  },
  {
    id: 'b5',
    name: 'McDonald\'s',
    logo: mcdonaldsLogo,
    description: 'World-famous burgers and fries.',
    offer: 'Special corporate box starting ₹200'
  }
];

export const mockCampaigns: Campaign[] = [
  { id: 'c1', brandId: 'b1', name: 'Summer Special - Domino\'s', isActive: true },
  { id: 'c2', brandId: 'b2', name: 'Pizza Fest', isActive: true },
  { id: 'c3', brandId: 'b3', name: 'Indian Thali Meals', isActive: true },
  { id: 'c4', brandId: 'b4', name: 'Healthy Subs & Salads', isActive: true },
  { id: 'c5', brandId: 'b5', name: 'Value Meals - McDonald\'s', isActive: true }
];

export const mockMenuItems: MenuItem[] = [
  {
    id: 'mi1',
    brandId: 'b1',
    campaignId: 'c1',
    name: 'Peppy Paneer Pizza',
    mealImage: img1565299624946,
    mrp: 350,
    offerPrice: 250,
    deliveryCharges: 25,
    proposedSaving: 100,
    dietaryType: 'VEG',
  },
  {
    id: 'mi4',
    brandId: 'b1',
    campaignId: 'c1',
    name: 'Choco Lava Cake',
    mealImage: img1509722747041,
    mrp: 120,
    offerPrice: 99,
    deliveryCharges: 0,
    proposedSaving: 21,
    dietaryType: 'VEG',
  },
  {
    id: 'mi2',
    brandId: 'b4',
    campaignId: 'c1',
    name: 'Roasted Chicken Sub',
    mealImage: img1509722747041,
    mrp: 280,
    offerPrice: 199,
    deliveryCharges: 20,
    proposedSaving: 81,
    dietaryType: 'NON_VEG',
  },
  {
    id: 'mi3',
    brandId: 'b2',
    campaignId: 'c1',
    name: 'Margherita Pizza Regular',
    mealImage: img1513104890138,
    mrp: 200,
    offerPrice: 149,
    deliveryCharges: 0,
    proposedSaving: 51,
    dietaryType: 'VEG',
  }
];

export const mockMealPlans: MealPlan[] = [
  {
    id: 'm1',
    title: 'Executive Lunch Box',
    description: 'A balanced meal with protein, complex carbs, and fresh greens. Changes daily.',
    pricePerMeal: 150,
    tags: ['Healthy', 'High Protein', 'Bestseller'],
    imageUrl: img1543339308
  },
  {
    id: 'm2',
    title: 'Lite Bites Subscription',
    description: 'Perfect for light eaters. Soups, salads, and wraps.',
    pricePerMeal: 120,
    tags: ['Low Calorie', 'Vegetarian'],
    imageUrl: img1512621776951
  },
  {
    id: 'm3',
    title: 'Power Breakfast Plan',
    description: 'Start your workday right with our protein-packed morning meals.',
    pricePerMeal: 99,
    tags: ['Morning', 'Energizing'],
    imageUrl: img1533089860892
  }
];
