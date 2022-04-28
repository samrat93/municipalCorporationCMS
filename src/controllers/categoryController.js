const Category = require("../models/complaintCategoryModel");

const CategoryPost = async (req, res) => {
  try {
    const category = new Category(req.body);
    await category.save();
    res.status(201).send(category);
    // res.send("Data saved successfully");
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};

const CategoryList = async (req, res, next) => {
  try {
    let { page, limit } = req.query;

    let start = 0;
    if (!page) {
      page = 1;
    }
    if (!limit) {
      limit = 2;
    }
    if (page) {
      start = (page - 1) * limit;
    }

    const catlist = await Category.find({});
    const catList = catlist.slice(start, start + Number(limit));
    const total = Math.ceil(catlist.length / Number(limit));

    res
      .status(200)
      .send({ current_page: page, limit, total_page: total, catList });
  } catch (e) {
    res.status(404).send();
  }
};

const CategoryUpdate = async (req, res) => {
  try {
    const catid = req.params.id;
    const category = await Category.findById(catid);
    if (!category) {
      throw new Error("Category Not Found.");
    }
    const updates = Object.keys(req.body);
    const allowedUpdates = ["category_name", "category_desc"];
    const isValidOperation = updates.every((update) =>
      allowedUpdates.includes(update)
    );
    if (!isValidOperation) {
      return res.status(400).send({ error: "Invalid updates." });
    }
    updates.forEach((update) => (category[update] = req.body[update]));
    await category.save();
    res.json("Data Updated Successfully.");
  } catch (e) {
    res.status(400).send(e.message);
  }
};

const CategoryDelete = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    await category.remove();
    res.status(200).send(category);
  } catch (e) {
    res.status(500).send(e);
  }
};

module.exports = { CategoryPost, CategoryList, CategoryUpdate, CategoryDelete };
