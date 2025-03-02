import { NextApiRequest, NextApiResponse } from "next";
import { authMW, corsMW, isPartOfHouse } from "@utils/middleware";
import prisma from "@utils/PrismaClient";
import { Session } from "next-auth";
import { House, Status, User } from "@prisma/client";
import isValidObjectId from "@utils/isValidObjectId";

export interface PaymentPostBody {
  amount: number;
  status?: Status;
  payerId: string;
  description: string;
  recipientId: string;
  createdAt: Date;
}

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  session: Session,
  house: House & { users: User[] }
) => {
  if (req.method === "GET") {
    const payments = await prisma.payment.findMany({
      where: {
        OR: [
          { payerId: session?.user?.id },
          { recipientId: session?.user?.id },
        ],
      },
      include: {
        Payer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        Recipient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
    res.status(200).json({ payments });
  } else if (req.method === "POST") {
    const bodies = req.body as PaymentPostBody[];
    bodies.forEach(({ payerId, recipientId, amount }) => {
      if (!isValidObjectId(payerId) || !isValidObjectId(recipientId))
        return res.status(400).json({ message: "Invalid user id" });
      if (payerId === recipientId)
        return res
          .status(400)
          .json({ message: "Payer and recipient cannot be the same" });
      if (isNaN(amount))
        return res.status(400).json({ message: "Amount must be a number" });
      if (amount <= 0)
        return res
          .status(400)
          .json({ message: "Amount must be greater than 0" });
    });
    const batchCreate = await prisma.payment.createMany({
      data: bodies.map(
        ({ payerId, recipientId, amount, createdAt, description }) => {
          return {
            houseId: house.id,
            amount: parseFloat(amount.toFixed(2)),
            status: Status.Pending,
            payerId: payerId,
            recipientId: recipientId,
            createdAt: createdAt,
            description: description,
          };
        }
      ),
    });
    res
      .status(200)
      .json({ ...batchCreate, message: "Payments created successfully" });
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
};

export default corsMW(authMW(isPartOfHouse(handler)));
