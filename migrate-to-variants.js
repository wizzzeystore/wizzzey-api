import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Import models
import { Product } from './src/models/Product.mo.js';
import { ProductVariant } from './src/models/ProductVariant.mo.js';

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const migrateProductsToVariants = async () => {
  try {
    console.log('Starting migration to product variants...');
    
    // Get all products that don't have variants yet
    const products = await Product.find({ hasVariants: { $ne: true } });
    console.log(`Found ${products.length} products to migrate`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const product of products) {
      console.log(`Processing product: ${product.name} (${product.id})`);
      
      // Check if product has colors and sizes
      const hasColors = product.colors && product.colors.length > 0;
      const hasSizes = product.availableSizes && product.availableSizes.length > 0;
      
      if (!hasColors && !hasSizes) {
        console.log(`Skipping ${product.name} - no colors or sizes to migrate`);
        skippedCount++;
        continue;
      }
      
      // Create variants based on colors and sizes
      const variants = [];
      
      if (hasColors && hasSizes) {
        // Create variants for each color-size combination
        for (const color of product.colors) {
          for (const size of product.availableSizes) {
            const variant = new ProductVariant({
              productId: product._id,
              color: color,
              size: size,
              sku: `${product.sku}-${color.name.toUpperCase()}-${size}`,
              price: product.price,
              compareAtPrice: product.compareAtPrice,
              costPrice: product.costPrice,
              stock: product.stock || 0,
              lowStockThreshold: product.lowStockThreshold,
              images: product.media || [],
              barcode: product.barcode,
              weight: product.weight,
              dimensions: product.dimensions,
              status: product.status === 'out_of_stock' ? 'out_of_stock' : 'active',
              isDefault: variants.length === 0 // First variant is default
            });
            variants.push(variant);
          }
        }
      } else if (hasColors) {
        // Create variants for each color only
        for (const color of product.colors) {
          const variant = new ProductVariant({
            productId: product._id,
            color: color,
            size: 'ONE_SIZE', // Default size for products without sizes
            sku: `${product.sku}-${color.name.toUpperCase()}`,
            price: product.price,
            compareAtPrice: product.compareAtPrice,
            costPrice: product.costPrice,
            stock: product.stock || 0,
            lowStockThreshold: product.lowStockThreshold,
            images: product.media || [],
            barcode: product.barcode,
            weight: product.weight,
            dimensions: product.dimensions,
            status: product.status === 'out_of_stock' ? 'out_of_stock' : 'active',
            isDefault: variants.length === 0
          });
          variants.push(variant);
        }
      } else if (hasSizes) {
        // Create variants for each size only
        for (const size of product.availableSizes) {
          const variant = new ProductVariant({
            productId: product._id,
            color: { name: 'Default', code: '#000000' }, // Default color
            size: size,
            sku: `${product.sku}-${size}`,
            price: product.price,
            compareAtPrice: product.compareAtPrice,
            costPrice: product.costPrice,
            stock: product.stock || 0,
            lowStockThreshold: product.lowStockThreshold,
            images: product.media || [],
            barcode: product.barcode,
            weight: product.weight,
            dimensions: product.dimensions,
            status: product.status === 'out_of_stock' ? 'out_of_stock' : 'active',
            isDefault: variants.length === 0
          });
          variants.push(variant);
        }
      }
      
      if (variants.length > 0) {
        // Save all variants
        await ProductVariant.insertMany(variants);
        
        // Update product to indicate it has variants
        await Product.findByIdAndUpdate(product._id, {
          hasVariants: true,
          defaultVariantId: variants[0]._id // Set first variant as default
        });
        
        console.log(`Created ${variants.length} variants for ${product.name}`);
        migratedCount++;
      } else {
        console.log(`No variants created for ${product.name}`);
        skippedCount++;
      }
    }
    
    console.log('\nMigration completed!');
    console.log(`Products migrated: ${migratedCount}`);
    console.log(`Products skipped: ${skippedCount}`);
    console.log(`Total products processed: ${migratedCount + skippedCount}`);
    
  } catch (error) {
    console.error('Migration error:', error);
  }
};

const rollbackMigration = async () => {
  try {
    console.log('Starting rollback...');
    
    // Delete all variants
    const deletedVariants = await ProductVariant.deleteMany({});
    console.log(`Deleted ${deletedVariants.deletedCount} variants`);
    
    // Reset products to not have variants
    const updatedProducts = await Product.updateMany(
      { hasVariants: true },
      { 
        $unset: { hasVariants: 1, defaultVariantId: 1 },
        $set: { hasVariants: false }
      }
    );
    console.log(`Reset ${updatedProducts.modifiedCount} products`);
    
    console.log('Rollback completed!');
    
  } catch (error) {
    console.error('Rollback error:', error);
  }
};

const main = async () => {
  const command = process.argv[2];
  
  await connectDB();
  
  switch (command) {
    case 'migrate':
      await migrateProductsToVariants();
      break;
    case 'rollback':
      await rollbackMigration();
      break;
    default:
      console.log('Usage:');
      console.log('  node migrate-to-variants.js migrate  - Migrate products to variants');
      console.log('  node migrate-to-variants.js rollback - Rollback migration');
      break;
  }
  
  await mongoose.disconnect();
  console.log('Disconnected from MongoDB');
};

main().catch(console.error); 