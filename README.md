# Domain and Invite Code
Domain: https://main.d33o3h8u5iyqzp.amplifyapp.com/
Invite Code: POKEBINDER2026

# PokeBinder

PokeBinder is a cloud-backed Pokémon card binder app built with React, TypeScript, AWS Lambda, DynamoDB, Cognito, and API Gateway. It lets users create digital binders, search for Pokémon cards, organize them into visual binder pages, and generate public read-only share links.

The project was built as a full-stack portfolio app with a focus on practical cloud architecture, authenticated user data, and a polished frontend experience.

## Overview

Users can create an account, confirm their email, log in, and manage their own card binders. Binder data is saved in DynamoDB through a protected API, so cards and binder changes persist across refreshes and devices. Cards can be searched through the Pokémon TCG API and added into binder slots with ownership status tracking.

Public sharing is supported through generated share links. A shared binder can be viewed without logging in, while editing remains restricted to the owner.

## Tech Stack

The frontend is built with React, TypeScript, Vite, and React Router. The backend uses AWS Lambda with API Gateway HTTP API routes. User authentication is handled by Amazon Cognito, while binder and card data are stored in DynamoDB. Infrastructure is managed with AWS CDK.

The deployed frontend is hosted with AWS Amplify Hosting.

## Main Features

PokeBinder supports authenticated accounts, cloud-saved binders, real Pokémon card search, multi-page binder layouts, visual binder previews, and public read-only sharing. Registration is protected with an invite code to reduce spam signups.

## Architecture

The app uses a static React frontend that communicates with an AWS API Gateway backend. Protected API routes require a Cognito JWT, while public share routes are intentionally unauthenticated.

Private binder data is stored by user ID, and public sharing uses a generated share ID to retrieve a read-only version of the binder.

```text
React / Vite Frontend
        ↓
API Gateway HTTP API
        ↓
AWS Lambda
        ↓
DynamoDB

Authentication:
React → Cognito → JWT-protected API routes
