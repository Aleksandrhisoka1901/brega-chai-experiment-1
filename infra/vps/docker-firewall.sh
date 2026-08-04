#!/bin/sh
set -eu

firewall_chain=BREGA-DOCKER-FIREWALL
public_interface=${BREGA_PUBLIC_INTERFACE:-}

if [ -z "$public_interface" ]; then
  public_interface=$(ip -4 route show default | awk 'NR == 1 { print $5 }')
fi

if [ -z "$public_interface" ]; then
  echo "Unable to determine the public network interface" >&2
  exit 1
fi

iptables -w -N "$firewall_chain" 2>/dev/null || true
iptables -w -F "$firewall_chain"
iptables -w -A "$firewall_chain" \
  -m conntrack --ctstate ESTABLISHED,RELATED \
  -j ACCEPT
iptables -w -A "$firewall_chain" \
  -i "$public_interface" \
  -p tcp \
  -m conntrack --ctorigdstport 80 \
  -j ACCEPT
iptables -w -A "$firewall_chain" \
  -i "$public_interface" \
  -p tcp \
  -m conntrack --ctorigdstport 443 \
  -j ACCEPT
iptables -w -A "$firewall_chain" \
  -i "$public_interface" \
  -j DROP
iptables -w -A "$firewall_chain" -j RETURN

if ! iptables -w -C DOCKER-USER -j "$firewall_chain" 2>/dev/null; then
  iptables -w -I DOCKER-USER 1 -j "$firewall_chain"
fi

echo "Docker firewall configured for public interface: $public_interface"
