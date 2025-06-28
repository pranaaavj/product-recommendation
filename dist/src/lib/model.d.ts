import * as tf from '@tensorflow/tfjs-node';
import { Interaction, Config, DataAdapter } from '../types';
export declare function createAndTrainModel(trainingData: number[][], userInteractions: Interaction[], config: Config): Promise<tf.LayersModel | null>;
export declare function saveModel(model: tf.LayersModel | null, config: Config): Promise<void>;
export declare function loadModel(config: Config): Promise<tf.LayersModel | null>;
export declare function trainRecommendationModel(config: Config, dataAdapter: DataAdapter): Promise<boolean>;
