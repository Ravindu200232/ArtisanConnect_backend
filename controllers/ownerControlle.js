import Owner from "../models/owner.js";
import {
  checkAdmin,
  checkCustomer,
  checkHasAccount,
  checkOwner,
} from "./authController.js";
//create restaurant
export async function createOwner(req, res) {
  try {
    if (checkHasAccount(req)) {
      const data = req.body;
      data.ownerId = req.user.id;
      data.ownerName = `${req.user?.firstName || ""} ${
        req.user?.lastName || ""
      }`.trim();

      if (checkOwner(req)) {
        const newOwner = new Owner(data);
        await newOwner.save();
        res.json({
          message: "now You are an Seller",
        });
        return;
      } else {
        res.status(401).json({
          message: "Can't access this task",
        });
        return;
      }
    } else {
      res.status(401).json({
        message: "Please login first",
      });
      return;
    }
  } catch (err) {
    res.status(500).json({
      error: "Internal Server error" || err,
    });
  }
}

//view restaurant
export async function getOwner(req, res) {
  try {
    if (checkHasAccount(req)) {
      if (checkAdmin(req)) {
        const result = await Owner.find();
        res.json(result);
        return;
      }

      if (checkOwner(req)) {
        const result = await Owner.find({
          ownerId: req.user.id,
        });
        res.json(result);
        return;
      }
      if (checkCustomer(req)) {
        const result = await Owner.find({
          verified: true,
        });
        res.json(result);
        return;
      } else {
        res.json({
          message: "can't access this task",
        });
        return;
      }
    } else {
      const result = await Owner.find({
        verified: true,
      });
      res.json(result);
      return;
    }
  } catch (err) {
    res.status(500).json({
      error: "Internal server error" || err,
    });
  }
}

//update restaurant
export async function updateOwner(req, res) {
  try {
    const id = req.params.id;
    const data = req.body;

    if (checkHasAccount(req)) {
      if (checkAdmin(req)) {
        const updateResult = await Owner.updateOne(
          {
            _id: id,
          },
          { verified: true }
        );

        if (updateResult.modifiedCount === 0) {
          res.status(404).json({
            message: "No restaurant found to update",
          });
          return;
        }

        res.json({
          message: "Update Successfully",
        });
        return;
      }

      if (checkOwner(req)) {
        await Owner.updateOne(
          {
            _id: id,
            ownerId: req.user.id,
          },
          {
            name: data.name,
            address: data.address,
            phone: data.phone,
            image: data.image,
            description: data.description,
          }
        );
        res.json({
          message: "Update Successfully",
        });
        return;
      } else {
        res.status(401).json({
          message: "can't do this task",
        });
        return;
      }
    } else {
      res.status(401).json({
        message: "Please Login first",
      });
    }
  } catch (err) {
    res.status(500).json({
      error: "Internal Server error" || err,
    });
  }
}

//delete restaurant
export async function deleteOwner(req, res) {
  try {
    const id = req.params.id;
    console.log(req.user);
    if (checkHasAccount(req)) {
      if (checkAdmin(req)) {
        await Owner.deleteOne({
          _id: id,
        });
        res.json({
          message: "Restaurant Delete Successfully",
        });
        return;
      }

      if (checkOwner(req)) {
        console.log(req.user, id);
        await Owner.deleteOne({
          ownerId: req.user.id,
          _id: id,
        });
        res.json({
          message: "Restaurant Deleted Successfully",
        });
        return;
      }
      res.json({
        message: "can't access this task",
      });
    } else {
      res.status(401).json({
        message: "Please login first",
      });
      return;
    }
  } catch (err) {
    res.status(500).json({
      error: "Internal Server error" || err,
    });
  }
}


export async function verification(req, res) {
  try {
    const id = req.params.id;

    if (checkHasAccount(req)) {
      if (checkAdmin(req)) {
        await Owner.updateOne(
          {
            _id: id,
          },
          {
            verified: true,
          }
        );
        res.json({
          message: "Seller verification Successfully",
        });
        return;
      } else {
        res.status(401).json({
          message: "can't access this task",
        });
        return;
      }
    } else {
      res.status(401).json({
        message: "Please login",
      });
    }
  } catch (err) {
    res.status(500).json({
      error: "Internal Server error " || err,
    });
  }
}

export async function getOne(req, res) {
  try {
    const id = req.params.id;

    const result = await Owner.findOne({
      _id: id,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({
      error: "Internal Server error" || err,
    });
  }
}
