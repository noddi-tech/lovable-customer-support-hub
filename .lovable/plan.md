

# Update Default Categories for Mobile Services Business

## Overview

Insert appropriate default categories into the `knowledge_categories` table that match your mobile services business (wheel change, car wash, doorstep services, etc.) instead of generic categories like "Shipping".

## Default Categories

The following categories will be inserted for your organization:

| Category | Color | Description |
|----------|-------|-------------|
| **Service Delivery** | Blue | Questions about on-site service execution and delivery |
| **Booking & Scheduling** | Green | Appointment booking, rescheduling, and availability inquiries |
| **Pricing & Payments** | Purple | Service pricing, payment methods, and billing questions |
| **Service Locations** | Orange | Coverage areas, travel fees, and location-based queries |
| **Technical Issues** | Teal | App issues, platform problems, and technical troubleshooting |
| **Account Management** | Pink | User accounts, profiles, and subscription management |
| **Service Providers** | Gray | Questions about service technicians and partner businesses |

## Implementation

Since the categories table is now dynamic and managed per-organization, I will insert these default categories directly into the database for your organization using a SQL insert statement.

## Changes Summary

| Action | Details |
|--------|---------|
| Database insert | Add 7 default categories to `knowledge_categories` table for your organization |

This is a one-time data insertion - no code changes are needed since the CategoryManager component already supports full CRUD operations for categories.

