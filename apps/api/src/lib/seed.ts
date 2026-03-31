import { prisma } from "./db.js";
import { DEFAULT_CATEGORIES } from "@dompetaing/shared";

type CategoryDef = {
  name: string;
  icon: string;
  color: string;
  type: string;
  is_system: boolean;
  sub_categories: readonly string[];
};

export async function seedUserCategories(userId: string): Promise<void> {
  const categories = DEFAULT_CATEGORIES as unknown as CategoryDef[];

  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    const category = await prisma.category.create({
      data: {
        user_id: userId,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        type: cat.type,
        is_system: cat.is_system,
        sort_order: i,
      },
    });

    for (let j = 0; j < cat.sub_categories.length; j++) {
      await prisma.subCategory.create({
        data: {
          category_id: category.id,
          name: cat.sub_categories[j],
          sort_order: j,
        },
      });
    }
  }
}
