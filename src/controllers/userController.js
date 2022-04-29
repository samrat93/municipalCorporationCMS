const User = require("../models/userModel");
const { emailsend } = require("../email/account");
const OtP = require("../models/otpModel");
const excelJs = require("exceljs");
const { verifyEmail, registerEmail } = require("../email/account");

const Register = async (req, res) => {
  try {
    const user = new User(req.body);
    registerEmail(req.body.email);
    await user.save();
    res.status(201).send(user);
  } catch (e) {
    res.status(400).send(e);
  }
};

const Login = async (req, res) => {
  try {
    const user = await User.findByCredentials(
      req.body.email,
      req.body.password
    );
    if (user.type !== req.body.type) {
      throw new Error("Login Types is not valid");
    }
    if (user.verify === false) {
      throw new Error("Wait for sometimes. Admin can verify you soon...");
    }
    const token = await user.generateAuthToken();

    res.status(200).send({
      _id: user._id,
      username: user.username,
      name: user.name,
      email: user.email,
      token,
    });
  } catch (e) {
    res.status(400).send(e.message);
  }
};

const listAllUser = async (req, res, next) => {
  try {
    let { page, limit, sort } = req.query;
    const size = parseInt(limit);
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
    console.log(start, start + Number(limit));

    const users0 = await User.find({ isAdmin: false });
    const users = users0.slice(start, start + Number(limit));
    const total = Math.ceil(users0.length / Number(limit));
    res.status(200).send({ page, limit, total, users });
  } catch (e) {
    console.log(e.message);
    res.status(400).send(e);
  }
};

const ActiveUsers = async (req, res) => {
  try {
    const activeUsers = await User.find({ verify: true, isAdmin: false });
    res.status(200).send(activeUsers);
  } catch (e) {
    res.status(404).send(e.message);
  }
};

const UnverifiedUsers = async (req, res) => {
  try {
    const UnverifiedUsers = await User.find({ verify: false, isAdmin: false });
    res.status(200).send(UnverifiedUsers);
  } catch (e) {
    res.status(404).send(e.message);
  }
};

const userDelete = async (req, res) => {
  try {
    const user = await User.findOneAndDelete({ _id: req.params.id });
    if (!user) {
      res.status(404).send("User not found.");
    }
    res.send(user);
  } catch (e) {
    res.status(500).send(e);
  }
};

const verifyUser = async (req, res) => {
  const userid = req.params.id;
  const user = await User.findById(userid);
  if (!user) {
    throw new Error("User not found");
  }
  verifyEmail(user.email);
  const updates = Object.keys(req.body);
  const allowedUpdates = ["verify"];

  const isValidOperation = updates.every((update) =>
    allowedUpdates.includes(update)
  );

  // console.log("data-in-verify" + isValidOperation);
  if (!isValidOperation) {
    return res.status(400).send({ error: "Invalid updates!" });
  }
  try {
    updates.forEach((update) => (user[update] = req.body[update]));
    await user.save();
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      verify: user.verify,
      type: user.type,
      mobileNo: user.mobileNo,
      isProfileUpdate: user.isProfileUpdate,
    });
  } catch (e) {
    res.status(400).send(e.message);
  }
};

const generateOTP = () => {
  var digits = "0123456789";
  let OTP = "";
  for (let i = 0; i < 4; i++) {
    OTP += digits[Math.floor(Math.random() * 10)];
  }
  return OTP;
};

const ForgetPassword = async (req, res) => {
  try {
    const user = await User.find({ email: req.body.email });
    if (user.length === 0) {
      throw new Error("User is not register with this email.");
    }
    const otp = generateOTP();
    const opts = new OtP({ ...req.body, otp });
    emailsend(req.body.email, otp);
    await opts.save();
    res.status(200).send(opts.email);
  } catch (e) {
    res.status(400).send(err.message);
  }
};

const UpdatePassword = async (req, res) => {
  const user = await OtP.find({ otp: req.body.otp, email: req.body.email });
  if (user.length === 0) {
    res.status(400).send("User not found, Sorry 😢");
  } else {
    const userData = await User.findOne({ email: req.body.email });
    userData.password = req.body.password;
    await userData.save();
    res.status(200).send("Password updated successfully.");
  }
};

const exportUser = async (req, res) => {
  const workbook = new excelJs.Workbook();
  const worksheet = workbook.addWorksheet("My Users");
  const path = "./files";
  worksheet.columns = [
    { header: "S.N", key: "s_no", width: 10 },
    { header: "username", key: "username", width: 10 },
    { header: "email", key: "email", width: 10 },
    { header: "type", key: "type", width: 10 },
    { header: "verify", key: "verify", width: 10 },
    { header: "createdAt", key: "createdAt", width: 10 },
    { header: "user_image", key: "user_image", width: 10 },
    { header: "address", key: "address", width: 10 },
    { header: "country", key: "country", width: 10 },
    { header: "first_name", key: "first_name", width: 10 },
    { header: "gender", key: "gender", width: 10 },
    { header: "first_name", key: "first_name", width: 10 },
    { header: "pincode", key: "pincode", width: 10 },
    { header: "state", key: "state", width: 10 },
  ];
  const userdata = await User.find({ isAdmin: false });
  // console.log("userdata", userdata);
  let counter = 1;
  userdata?.forEach((user) => {
    user.s_no = counter;
    worksheet.addRow(user);
    counter++;
  });
  worksheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true };
  });
  const data2 = await workbook.xlsx;
  // console.log("data2", data2);
  try {
    const data = await workbook.xlsx
      .writeFile(`${path}/users.xlsx`)
      .then(() => {
        res.send({
          status: "success",
          message: "file successfully downloaded",
          path: `${path}/users.xlsx`,
        });
      });
    // console.log("data is ", data);
  } catch (e) {
    res.send({
      status: "error",
      message: "something went wrong",
    });
  }
};

module.exports = {
  Register,
  Login,
  listAllUser,
  userDelete,
  verifyUser,
  ForgetPassword,
  UpdatePassword,
  ActiveUsers,
  UnverifiedUsers,
  exportUser,
};
