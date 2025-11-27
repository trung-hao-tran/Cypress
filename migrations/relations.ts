import { relations } from "drizzle-orm/relations";
import { workspaces, folders, files, users, customers, products, prices, subscriptions } from "./schema";

export const foldersRelations = relations(folders, ({ one, many }) => ({
	workspace: one(workspaces, {
		fields: [folders.workspaceId],
		references: [workspaces.id]
	}),
	files: many(files),
}));

export const workspacesRelations = relations(workspaces, ({ many }) => ({
	folders: many(folders),
	files: many(files),
}));

export const filesRelations = relations(files, ({ one }) => ({
	folder: one(folders, {
		fields: [files.folderId],
		references: [folders.id]
	}),
	workspace: one(workspaces, {
		fields: [files.workspaceId],
		references: [workspaces.id]
	}),
}));

export const usersRelations = relations(users, ({ many }) => ({
	customers: many(customers),
	subscriptions: many(subscriptions),
}));

export const customersRelations = relations(customers, ({ one }) => ({
	user: one(users, {
		fields: [customers.id],
		references: [users.id]
	}),
}));

export const pricesRelations = relations(prices, ({ one }) => ({
	product: one(products, {
		fields: [prices.productId],
		references: [products.id]
	}),
}));

export const productsRelations = relations(products, ({ many }) => ({
	prices: many(prices),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
	user: one(users, {
		fields: [subscriptions.userId],
		references: [users.id]
	}),
}));