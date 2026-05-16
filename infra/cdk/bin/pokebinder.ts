#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { PokebinderStack } from "../lib/pokebinder-stack";

const app = new cdk.App();

new PokebinderStack(app, "PokebinderStack");