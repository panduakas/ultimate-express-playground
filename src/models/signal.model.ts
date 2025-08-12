import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

type SignalType = 'BUY' | 'SELL' | 'HOLD';

interface SignalAttributes {
  id: number;
  timestamp: Date;
  predictedPrice: string;
  signal: SignalType;
  strategyDetails: string; // JSON string of combined strategy outputs
}

interface SignalCreationAttributes extends Optional<SignalAttributes, 'id'> {}

class Signal extends Model<SignalAttributes, SignalCreationAttributes> implements SignalAttributes {
  public id!: number;
  public timestamp!: Date;
  public predictedPrice!: string;
  public signal!: SignalType;
  public strategyDetails!: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Signal.init(
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
    predictedPrice: {
      type: DataTypes.DECIMAL(20, 8),
      allowNull: false,
    },
    signal: {
      type: DataTypes.ENUM('BUY', 'SELL', 'HOLD'),
      allowNull: false,
    },
    strategyDetails: {
      type: DataTypes.TEXT, // Store as JSON string
      allowNull: true,
    },
  },
  {
    tableName: 'signals',
    sequelize,
  }
);

export { Signal, SignalType };