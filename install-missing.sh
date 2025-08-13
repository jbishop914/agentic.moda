#!/bin/bash

# Install missing dependencies that are used in the code but not in package.json

echo "Installing missing dependencies..."

# Required for image generation
npm install replicate

# Required for visual workflow builder  
npm install reactflow @reactflow/core @reactflow/controls @reactflow/minimap @reactflow/background

# Required for API interactions
npm install axios

# Required for charts/visualization (if using)
npm install recharts

# Required for better date handling
npm install date-fns

echo "Dependencies installed!"
echo "Now run: npm run build"
