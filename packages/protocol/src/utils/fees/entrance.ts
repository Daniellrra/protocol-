import { AddressLike } from '@enzymefinance/ethers';
import { BigNumber, BigNumberish, constants, utils } from 'ethers';
import { encodeArgs } from '../encoding';

export function entranceRateBurnFeeConfigArgs({ rate }: { rate: BigNumberish }) {
  return encodeArgs(['uint256'], [rate]);
}

export function entranceRateDirectFeeConfigArgs({
  rate,
  recipient = constants.AddressZero,
}: {
  rate: BigNumberish;
  recipient?: AddressLike;
}) {
  return encodeArgs(['uint256', 'address'], [rate, recipient]);
}

export function entranceRateFeeSharesDue({ rate, sharesBought }: { rate: BigNumberish; sharesBought: BigNumberish }) {
  return BigNumber.from(sharesBought).mul(rate).div(utils.parseEther('1').add(rate));
}
