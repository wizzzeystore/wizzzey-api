import mongoose, { Schema } from 'mongoose';

const SizeChartSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String },
  image: { type: String, required: true }, // path or URL to the uploaded image
}, {
  timestamps: true
});

const SizeChart = mongoose.models.SizeChart || mongoose.model('SizeChart', SizeChartSchema);

export { SizeChart }; 