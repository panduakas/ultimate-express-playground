import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface BtcPriceAttributes {
  id: number;
  timestamp: Date;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

interface BtcPriceCreationAttributes extends Optional<BtcPriceAttributes, 'id'> {}

class BtcPrice extends Model<BtcPriceAttributes, BtcPriceCreationAttributes> implements BtcPriceAttributes {
  public id!: number;
  public timestamp!: Date;
  public open!: string;
  public high!: string;
  public low!: string;
  public close!: string;
  public volume!: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

BtcPrice.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      unique: true,
    },
    open: {
      type: DataTypes.DECIMAL(20, 8),
      allowNull: false,
    },
    high: {
      type: DataTypes.DECIMAL(20, 8),
      allowNull: false,
    },
    low: {
      type: DataTypes.DECIMAL(20, 8),
      allowNull: false,
    },
    close: {
      type: DataTypes.DECIMAL(20, 8),
      allowNull: false,
    },
    volume: {
      type: DataTypes.DECIMAL(20, 8),
      allowNull: false,
    },
  },
  {
    tableName: 'btc_prices',
    sequelize,
  }
);

export { BtcPrice };