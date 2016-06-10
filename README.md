# Quick REST API Server

This project aims at creating a simple yet powerful REST API server over MongoDB to support rich web applications. It provides the
core features like security and all basic data operations (Create, List, Update, Remove, Show). It can easily be built as a docker
image and run in your favorite cloud provider, alone or in docker-compose with your site.

# Quick Start

Just download and unzip the project on your local machine using (this link)[https://github.com/jgrenon/qrest-api-server/archive/master.zip]


# Security

## Register user accounts

You can register new user account with POST /register. The request body should be a JSON object containing the following fields:

- username
- password
- email

The builtin handler will encrypt the password, but no confirmation or validation emails will be sent. You should use your favorite mailer
module in a **post hook** (see /models/users.model.js)

## Create application

You might want to open your REST Api to multiple applications.

# Add Routes

# Add Models

# Model Operations

# Create

# Update

# List

# Show

# Remove

# Built-in Filter Mechanisms

# Schema
