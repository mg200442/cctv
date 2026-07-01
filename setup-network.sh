#!/bin/bash
# Run as admin (air) to enable the Zosi camera subnet
# Usage: sudo bash setup-network.sh

set -e

echo "Setting up network aliases for Zosi ZG2323M (192.168.138.3)..."

sudo ifconfig en0 alias 192.168.138.100 netmask 255.255.255.0
sudo ifconfig en0 alias 192.168.138.1 netmask 255.255.255.0

echo "Enabling IP forwarding..."
sudo sysctl -w net.inet.ip.forwarding=1

echo "Setting up NAT..."
echo "nat on en0 from 192.168.138.0/24 to any -> (en0)
pass all" | sudo pfctl -f - -e 2>/dev/null || true

echo ""
echo "✓ Network configured. Testing camera reachability..."
ping -c 2 -W 1000 192.168.138.3 && echo "✓ Camera reachable!" || echo "✗ Camera not responding"

echo ""
echo "RTSP stream: rtsp://admin:admin@192.168.138.3:554/video1"
echo "Now start the dashboard:  npm run dev:all"
