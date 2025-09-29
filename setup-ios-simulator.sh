#!/bin/bash

# ButterUp iOS Simulator Setup Script
# This script helps set up and launch iOS Simulator for ButterUp app testing

echo "🍎 ButterUp iOS Simulator Setup"
echo "==============================="

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ iOS Simulator only works on macOS!"
    echo "For Windows/Linux, use Android emulator instead."
    exit 1
fi

# Check if Xcode is installed
if ! command -v xcode-select &> /dev/null; then
    echo "❌ Xcode not found!"
    echo "Please install Xcode from the Mac App Store"
    exit 1
fi

echo "✅ Xcode found"

# Check if Xcode command line tools are installed
if ! xcode-select -p &> /dev/null; then
    echo "📦 Installing Xcode command line tools..."
    xcode-select --install
    echo "Please complete the installation and run this script again"
    exit 1
fi

echo "✅ Xcode command line tools installed"

# Check if Simulator is available
if ! command -v xcrun simctl &> /dev/null; then
    echo "❌ iOS Simulator not found!"
    echo "Please install Xcode with iOS SDK"
    exit 1
fi

echo "✅ iOS Simulator found"

# List available simulators
echo ""
echo "📱 Available iOS Simulators:"
xcrun simctl list devices available | grep -E "(iPhone|iPad)" | head -10

# Find a good default simulator
DEFAULT_SIM=$(xcrun simctl list devices available | grep "iPhone 15" | head -1 | sed 's/.*(\([^)]*\)).*/\1/')
if [ -z "$DEFAULT_SIM" ]; then
    DEFAULT_SIM=$(xcrun simctl list devices available | grep "iPhone 14" | head -1 | sed 's/.*(\([^)]*\)).*/\1/')
fi

if [ -z "$DEFAULT_SIM" ]; then
    DEFAULT_SIM=$(xcrun simctl list devices available | grep "iPhone" | head -1 | sed 's/.*(\([^)]*\)).*/\1/')
fi

if [ -n "$DEFAULT_SIM" ]; then
    echo ""
    echo "🎯 Using default simulator: $DEFAULT_SIM"
    
    # Boot the simulator if not already running
    SIM_STATE=$(xcrun simctl list devices | grep "$DEFAULT_SIM" | grep -o "([^)]*)" | tail -1 | tr -d "()")
    
    if [ "$SIM_STATE" != "Booted" ]; then
        echo "🚀 Starting iOS Simulator..."
        xcrun simctl boot "$DEFAULT_SIM"
        open -a Simulator
        
        # Wait for simulator to boot
        echo "⏳ Waiting for simulator to boot..."
        while [ "$(xcrun simctl list devices | grep "$DEFAULT_SIM" | grep -o "([^)]*)" | tail -1 | tr -d "()")" != "Booted" ]; do
            sleep 2
            echo -n "."
        done
        echo ""
        echo "✅ iOS Simulator started successfully!"
    else
        echo "✅ iOS Simulator is already running"
        open -a Simulator
    fi
else
    echo "❌ No suitable iOS Simulator found"
    echo "Please install iOS SDK through Xcode"
    exit 1
fi

# Check if we're in the ButterUp project
if [ -f "ButterUpMobile/package.json" ]; then
    echo ""
    echo "🧈 ButterUp project detected!"
    
    # Ask if user wants to start the app
    read -p "Do you want to start the ButterUp mobile app? (y/n): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
        echo "🚀 Starting ButterUp mobile app..."
        
        # Check if node_modules exists
        if [ ! -d "ButterUpMobile/node_modules" ]; then
            echo "📦 Installing dependencies..."
            cd ButterUpMobile
            npm install
            cd ..
        fi
        
        # Start the app
        cd ButterUpMobile
        echo "🎯 Running: npm run ios"
        npm run ios
    fi
else
    echo ""
    echo "💡 To test ButterUp mobile app:"
    echo "cd ButterUpMobile"
    echo "npm run ios"
fi

echo ""
echo "🎉 iOS Simulator setup complete!"
echo ""
echo "📋 Useful commands:"
echo "• List simulators: xcrun simctl list devices"
echo "• Boot simulator: xcrun simctl boot SIMULATOR_ID"
echo "• Open Simulator app: open -a Simulator"
echo "• Reset simulator: xcrun simctl erase SIMULATOR_ID"
