import { NextApiRequest, NextApiResponse } from "next";
import { authMW, corsMW, isPartOfHouse } from "@utils/middleware";
import prisma from "@utils/PrismaClient";
import { Session } from "next-auth";
import { Status, House, User } from "@prisma/client";
import isValidObjectId from "@utils/isValidObjectId";

export interface PaymentIdPutBody {
  amount?: number;
  description?: string;
  status?: Status;
}

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  session: Session,
  _house: House & { users: User[] }
) => {
  const paymentId = req.query.paymentId as string;
  if (!isValidObjectId(paymentId))
    return res.status(400).json({ message: "Invalid payment id" });

  //get payment
  const payment = await prisma.payment.findUnique({
    where: {
      id: paymentId,
    },
  });

  //handle no payment
  if (!payment) return res.status(404).json({ message: "Payment not found" });

  //return payment if GET
  if (req.method === "GET") {
    return res.status(200).json({ payment });
  }

  if (
    payment.payerId !== session.user.id &&
    payment.recipientId !== session.user.id
  )
    return res
      .status(403)
      .json({ message: "Only payers and recipients can edit their payments" });

  if (req.method === "DELETE") {
    //set status to cancelled
    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: Status.Cancelled },
    });
    return res.status(200).json({ message: "Payment cancelled successfully" });
  } else if (req.method === "PATCH" || req.method === "PUT") {
    //update it
    const { status, amount, description } = req.body as PaymentIdPutBody;
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: { status, amount, description },
    });
    return res.status(200).json({ payment: updatedPayment });
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
};

export default corsMW(authMW(isPartOfHouse(handler)));
