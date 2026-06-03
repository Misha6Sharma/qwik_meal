import { Brand, Campaign } from './types';
import { dbService } from './db';

export const getBrands = async (): Promise<Brand[]> => {
  return await dbService.getBrands();
};

export const saveBrands = async (brands: Brand[]) => {
  // Use map to setDoc for each? Or no-op since dbService handles updates directly
};

export const updateBrand = async (updatedBrand: Brand) => {
  await dbService.updateBrand(updatedBrand);
};

export const addBrand = async (newBrand: Brand) => {
  await dbService.addBrand(newBrand);
  
  // Automatically create a default campaign for the new brand
  const defaultCampaign: Campaign = {
    id: `c-${Date.now()}`,
    brandId: newBrand.id,
    name: 'Main Campaign',
    isActive: true
  };
  await dbService.addCampaign(defaultCampaign);
};

export const deleteBrand = async (brandId: string) => {
  await dbService.deleteBrand(brandId);
};
